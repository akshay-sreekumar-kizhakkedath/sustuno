// Optimizer Pipeline Service
// Integrates: validation, reference data, rules, generation, constraints, model, ΔE, scoring, ranking, persistence.

const { validateOptimizationRequest } = require('./inputValidator');
const { retrieveReferenceData } = require('./referenceDataService');
const { loadRules, evaluateRules } = require('./constraintEngine');
const { generateCandidates } = require('./candidateGenerator');
const { predictShadeBatch, getModelStatus } = require('./shadePredictionModel');
const { calculateDeltaE } = require('./deltaE');
const { estimateRecipeCost } = require('./costCalculator');
const { estimateWater } = require('./waterEstimator');
const { scoreCandidate } = require('./scoringEngine');

async function optimizeRecipe(request) {
  // 1. Validate input (structured or legacy). The normalized legacy-shaped
  // object drives the pipeline; structured context is preserved for traceability.
  const validation = validateOptimizationRequest(request);
  if (!validation.valid) {
    return { status: 'failed', optimization_id: null, errors: validation.errors, message: 'Input validation failed.' };
  }
  const req = validation.normalized || request;
  const requestContext = {
    fabric_id: validation.normalized && validation.normalized.fabric_id,
    machine_id: validation.normalized && validation.normalized.machine_id,
    fiber_composition_structured: validation.normalized && validation.normalized.fiber_composition_structured,
    resource_source: validation.normalized && validation.normalized.resource_source,
    inventory_status: validation.normalized && validation.normalized.inventory_status,
    warnings: validation.warnings || [],
  };

  // 2. Load reference data
  const referenceData = await retrieveReferenceData(req);

  // 3. Load KB rules
  const rules = await loadRules();

  // 4. Generate candidates (deterministic)
  const candidates = await generateCandidates(req, { candidateCount: 100 });

  // 5. Constraint evaluation + model prediction + scoring
  const results = [];
  const modelStatus = getModelStatus();
  const recommendedConstraints = [];

  // Batch shade prediction: one Python process for all candidates (single model
  // load). When no model exists this returns all-null rows with no subprocess.
  const batchFeatures = candidates.map(cand => ({
    fabric: req.fabric_type,
    fabric_type: req.fabric_type,
    fiber_composition: (req.fiber_composition || []).join(' '),
    gsm: req.gsm,
    fabric_weight_kg: req.fabric_weight_kg,
    dye_class: req.dye_class,
    dyes: cand.dyes,
    dye_quantities: cand.dyes,
    chemicals: cand.chemicals,
    liquor_ratio: cand.process_parameters ? cand.process_parameters.liquor_ratio : null,
    temperature: cand.process_parameters ? cand.process_parameters.temperature : null,
    time_minutes: cand.process_parameters ? cand.process_parameters.time_minutes : null,
    ph: cand.process_parameters ? cand.process_parameters.ph : null,
    machine_id: req.machine_id,
  }));
  const batchPred = predictShadeBatch(batchFeatures);

  for (let ci = 0; ci < candidates.length; ci++) {
    const cand = candidates[ci];
    // Evaluate rules (advisory/prototype mode)
    const ruleResults = evaluateRules({ ...cand, dye_class: req.dye_class, fiber: req.fabric_type, chemicals: cand.chemicals }, rules, 'advisory');
    const hasCritical = ruleResults.some(r => r.severity === 'critical');
    const hasFail = ruleResults.some(r => r.status === 'fail');

    // Basic hard constraint: inventory not directly enforced here; can be added if DB inventory table exists
    // For prototype, treat severe inventory issues as advisory if no DB inventory table available.
    const violations = [];
    for (const r of ruleResults) {
      if (r.status === 'fail') violations.push({ type: 'kb_rule', message: r.message, severity: r.severity });
      else if (r.status === 'warning') violations.push({ type: 'kb_advisory', message: r.message, severity: r.severity });
    }
    if (hasCritical && !hasFail) {
      violations.push({ type: 'kb_advisory', message: 'Critical advisory from pending KB rule.', severity: 'warning' });
    }

    const accepted = violations.filter(v => v.severity === 'critical').length === 0;

    // Shade prediction (from the single batch-inference call above; nulls when unavailable)
    const bp = (batchPred.results && batchPred.results[ci]) || { L: null, a: null, b: null };
    const predictedLab = { L: bp.L ?? null, a: bp.a ?? null, b: bp.b ?? null };

    const deltaEValue = predictedLab.L !== null ? calculateDeltaE({ L: predictedLab.L, a: predictedLab.a, b: predictedLab.b }, req.target_lab) : null;
    const costValue = estimateRecipeCost({ ...cand, dyes: cand.dyes, chemicals: cand.chemicals, process_parameters: cand.process_parameters, quantity_kg: req.fabric_weight_kg || 100 });

    const score = scoreCandidate(cand, { L: predictedLab.L, a: predictedLab.a, b: predictedLab.b }, req.target_lab, deltaEValue, costValue, req.optimization_preferences || {});

    // Process water: dye-bath liquor arithmetic + KB machine band (reported, not ranked).
    const waterValue = estimateWater({
      liquor_ratio: cand.process_parameters ? cand.process_parameters.liquor_ratio : null,
      fabric_weight_kg: req.fabric_weight_kg,
      machine_id: req.machine_id,
    });

    results.push({
      candidate_id: cand.candidate_id,
      accepted,
      violations,
      rule_results: ruleResults,
      predicted_lab: { L: predictedLab.L, a: predictedLab.a, b: predictedLab.b },
      delta_e: deltaEValue,
      estimated_cost: costValue,
      estimated_water: waterValue,
      score,
      dyes: cand.dyes,
      chemicals: cand.chemicals,
      process_parameters: cand.process_parameters,
    });
  }

  // Rank: best = lowest deltaE among feasible candidates; if deltaE unavailable, use score
  const feasible = results.filter(r => r.accepted);
  const ranked = feasible.length > 0 ? feasible.sort((a, b) => {
    if (a.delta_e !== null && b.delta_e !== null) return a.delta_e - b.delta_e;
    return b.score.total_score - a.score.total_score;
  }) : [];

  const recommended = ranked[0] || null;

  // Persistence: store to dye_opt_sessions / dye_opt_inputs / outputs / constraints if DB available
  // Note: for prototype, persistence not fully enforced due to lack of dedicated optimizer persistence schema.
  // Existing dye_opt_sessions table can be reused. No destructive changes made.

  // Request/model/quality statuses are reported separately: a technically
  // successful request must never read as a successful production prediction.
  const modelTier = modelStatus.status === 'available'
    ? 'validated_model'
    : (modelStatus.status === 'demo_synthetic' ? 'demo_synthetic' : 'model_unavailable');
  const tierMessages = {
    validated_model: 'Prediction produced by a validated production shade model.',
    demo_synthetic: 'DEMO / SYNTHETIC MODEL — this prediction uses synthetic training data and is for prototype demonstration only. It must not be treated as a production shade prediction.',
    model_unavailable: 'MODEL NOT AVAILABLE — no validated production model is currently available. Rule-based candidate generation ran, but ML shade prediction is unavailable (predicted Lab* is null).',
  };

  const resultPayload = {
    optimization_id: `OPT-${Date.now()}`,
    status: recommended ? (recommended.delta_e !== null ? 'completed' : 'partial') : 'failed',
    request_status: recommended ? 'completed' : 'failed',
    model_tier: modelTier,
    model_tier_message: tierMessages[modelTier],
    model_status: modelStatus,
    request_context: requestContext,
    recommended_recipe: recommended ? {
      candidate_id: recommended.candidate_id,
      dyes: recommended.dyes,
      chemicals: recommended.chemicals,
      process_parameters: recommended.process_parameters,
      predicted_lab: recommended.predicted_lab,
      delta_e: recommended.delta_e,
      estimated_cost: recommended.estimated_cost,
      estimated_water: recommended.estimated_water,
      score: recommended.score,
    } : null,
    target_lab: req.target_lab,
    warnings: results.filter(r => r.violations.length > 0).map(r => ({ candidate_id: r.candidate_id, violations: r.violations })),
    constraint_evaluations: results.map(r => ({ candidate_id: r.candidate_id, violations: r.violations, accepted: r.accepted })),
    top_candidates: ranked.slice(0, 5).map(r => ({
      candidate_id: r.candidate_id,
      delta_e: r.delta_e,
      estimated_cost: r.estimated_cost,
      estimated_water: r.estimated_water,
      score: r.score,
      dyes: r.dyes,
      chemicals: r.chemicals,
      process_parameters: r.process_parameters,
      predicted_lab: r.predicted_lab,
    })),
    notes: 'KB rules have pending human validation. They are treated as advisory/prototype constraints only.',
    delta_e_interpretation: 'threshold not configured',
    delta_e_note: 'ΔE76 is calculated correctly, but no validated project/KB acceptance threshold exists, so no pass/fail or Excellent/Good/Poor label is assigned.',
  };

  if (!recommended) {
    resultPayload.message = 'No feasible candidates found. Check inventory/process constraints or model status.';
    resultPayload.status = 'failed';
    resultPayload.request_status = 'failed';
  } else if (recommended.delta_e === null) {
    resultPayload.message = 'Recommended recipe selected by score ranking, but shade prediction model unavailable.';
    resultPayload.status = 'partial';
  }

  return resultPayload;
}

module.exports = { optimizeRecipe };
