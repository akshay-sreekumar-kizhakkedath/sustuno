// Batch Lifecycle Service for SUSTUNO Connected System
// Manages the full textile batch lifecycle:
// Production Order → Optimization → Batch → Production → Shade → Wastewater → ETP → Report → Training

const { supabase } = require('../database/supabaseClient');
const { isMissingTableError } = require('../database/schemaGuard');
const { confirmRecipe, getBatchDossier } = require('./workflowService');
const { predictWastewaterProfile } = require('./wastewater/wastewaterPredictor');
const { evaluateEtpDecision } = require('./etp/etpDecisionEngine');
const { deltaE76 } = require('./dyeOptimization/deltaE');

function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ORDER-${year}-${seq}`;
}

async function createProductionOrder(input) {
  const orderId = input.order_number || generateOrderId();
  const orderRow = {
    order_number: orderId,
    customer: input.customer || 'Internal Production',
    fabric_type: input.fabric_type,
    fiber_composition: typeof input.fiber_composition === 'string'
      ? input.fiber_composition
      : JSON.stringify(input.fiber_composition || []),
    batch_weight_kg: input.batch_weight_kg || 100,
    gsm: input.gsm || 180,
    target_shade: input.target_shade ? JSON.stringify(input.target_shade) : null,
    shade_depth: input.shade_depth || 'Medium',
    dye_class: input.dye_class || 'Reactive',
    machine: input.machine || 'TECWIN-HTHP-300',
    status: 'CREATED',
    notes: JSON.stringify({ lifecycle_status: 'PRODUCTION_ORDER_CREATED', ...input }),
  };

  const { data, error } = await supabase
    .from('production_orders')
    .insert([orderRow])
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return createProductionOrderFallback(input, orderId);
    }
    throw error;
  }

  return { success: true, order: data, order_number: orderId };
}

async function createProductionOrderFallback(input, orderId) {
  const orderRow = {
    batch_id: orderId,
    fabric_type: input.fabric_type,
    fiber_composition: typeof input.fiber_composition === 'string'
      ? input.fiber_composition
      : JSON.stringify(input.fiber_composition || []),
    fabric_weight_kg: input.batch_weight_kg || 100,
    gsm: input.gsm || 180,
    dye_class: input.dye_class || 'Reactive',
    machine: input.machine || 'TECWIN-HTHP-300',
    status: 'draft',
    data_quality_status: 'draft',
    data_source: 'production_order',
    notes: JSON.stringify({
      order_number: orderId,
      customer: input.customer || 'Internal Production',
      target_shade: input.target_shade,
      shade_depth: input.shade_depth || 'Medium',
      lifecycle_status: 'PRODUCTION_ORDER_CREATED',
      created_at: new Date().toISOString(),
    }),
  };

  const { data, error } = await supabase
    .from('dye_batches')
    .insert([orderRow])
    .select()
    .single();

  if (error) throw error;
  return { success: true, order: data, order_number: orderId };
}

async function createOptimizationFromOrder(orderNumber, preferences = {}) {
  const { data: order, error: orderErr } = await supabase
    .from('dye_batches')
    .select('*')
    .eq('batch_id', orderNumber)
    .maybeSingle();

  if (!order || orderErr) {
    const { data: order2, error: orderErr2 } = await supabase
      .from('dye_batches')
      .select('*')
      .eq('id', orderNumber)
      .maybeSingle();
    if (!order2 || orderErr2) throw new Error(`Production order ${orderNumber} not found`);
    return createOptimizationFromBatch(order2.id, preferences);
  }
  return createOptimizationFromBatch(order.id, preferences);
}

async function createOptimizationFromBatch(batchId, preferences = {}) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const targetShade = dossier.target_shade || {};
  const plannedProc = (dossier.process || []).find(p => p.process_type === 'planned') || {};

  const optPayload = {
    batch_id: dossier.batch_id,
    fabric_id: dossier.fabric_type,
    fiber_composition: dossier.fiber_composition,
    fabric_weight_kg: dossier.fabric_weight_kg,
    gsm: dossier.gsm,
    dye_class: dossier.dye_class,
    machine_id: dossier.machine,
    liquor_ratio: plannedProc.liquor_ratio || 10,
    temperature: plannedProc.temperature || 60,
    time_minutes: plannedProc.time_minutes || 60,
    ph: plannedProc.ph || 11,
    target_shade: {
      L: targetShade.target_l ?? 45,
      a: targetShade.target_a ?? 10,
      b: targetShade.target_b ?? -20,
      shade_name: targetShade.shade_name || 'Navy',
      shade_depth: targetShade.shade_depth || 'Medium',
    },
    optimization_preferences: {
      shade_weight: preferences.shade_weight ?? 1.0,
      cost_weight: preferences.cost_weight ?? 0.5,
      water_weight: preferences.water_weight ?? 0.0,
    },
  };

  const { optimizeRecipe } = require('./dyeOptimization/optimizer');
  const optResult = await optimizeRecipe(optPayload);

  const sessionId = optResult?.optimization?.session_id || null;
  if (sessionId) {
    await supabase.from('dye_batches').update({ optimization_id: sessionId }).eq('id', batchId);
  }

  await supabase.from('dye_batches').update({
    lifecycle_status: 'OPTIMIZATION_PENDING',
  }).eq('id', batchId);

  return {
    success: true,
    batch_id: dossier.batch_id,
    optimization: optResult,
    session_id: sessionId,
  };
}

async function useRecommendedRecipe(batchId, recipeData = null) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  let recommendedRecipe = recipeData;
  if (!recommendedRecipe) {
    recommendedRecipe = dossier.confirmed_recipe;
  }
  if (!recommendedRecipe && dossier.optimization) {
    recommendedRecipe = dossier.optimization.recommended_recipe || dossier.optimization;
  }
  if (!recommendedRecipe && dossier.optimization_session) {
    recommendedRecipe = dossier.optimization_session;
  }
  if (!recommendedRecipe) {
    // Create a recipe from the dossier's process/dyes/chemicals as fallback
    recommendedRecipe = {
      dyes: (dossier.dyes || []).map(d => ({
        dye_name: d.dye_name,
        pct_owf: d.planned_concentration,
        quantity_kg: d.planned_quantity_kg,
      })),
      chemicals: (dossier.chemicals || []).map(c => ({
        chemical_name: c.chemical_name,
        dosage: c.planned_dosage,
        unit: c.unit,
      })),
      process_parameters: (dossier.process || []).find(p => p.process_type === 'planned') || {},
    };
  }
  if (!recommendedRecipe) throw new Error('No recommended recipe found');

  const result = await confirmRecipe(batchId, recommendedRecipe);
  return result;
}

async function createBatchFromOptimization(batchId) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const confirmedRecipe = dossier.confirmed_recipe || dossier.optimization?.recommended_recipe;
  if (!confirmedRecipe) throw new Error('No confirmed recipe to create batch from');

  await confirmRecipe(batchId, confirmedRecipe);

  return {
    success: true,
    batch_id: dossier.batch_id,
    lifecycle_status: 'RECIPE_CONFIRMED',
  };
}

async function recordActualRecipe(batchId, actualDyes, actualChemicals, actualProcess) {
  const { data: batch, error: batchErr } = await supabase
    .from('dye_batches').select('id').eq('id', batchId).maybeSingle();
  if (!batch || batchErr) throw new Error(`Batch ${batchId} not found`);

  if (Array.isArray(actualDyes) && actualDyes.length > 0) {
    for (const d of actualDyes) {
      const updates = {};
      if (d.actual_concentration !== undefined) updates.actual_concentration = d.actual_concentration;
      if (d.actual_quantity_kg !== undefined) updates.actual_quantity_kg = d.actual_quantity_kg;
      if (Object.keys(updates).length === 0) continue;
      let q = supabase.from('dye_batch_dyes').update(updates).eq('batch_id', batchId);
      if (d.id) q = q.eq('id', d.id);
      else if (d.dye_name) q = q.eq('dye_name', d.dye_name);
      await q;
    }
  }

  if (Array.isArray(actualChemicals) && actualChemicals.length > 0) {
    for (const c of actualChemicals) {
      const updates = {};
      if (c.actual_dosage !== undefined) updates.actual_dosage = c.actual_dosage;
      if (Object.keys(updates).length === 0) continue;
      let q = supabase.from('dye_batch_chemicals').update(updates).eq('batch_id', batchId);
      if (c.id) q = q.eq('id', c.id);
      else if (c.chemical_name) q = q.eq('chemical_name', c.chemical_name);
      await q;
    }
  }

  if (actualProcess) {
    const { data: existingProcess } = await supabase
      .from('dye_batch_process')
      .select('id').eq('batch_id', batchId).eq('process_type', 'actual').maybeSingle();

    const processRow = {
      batch_id: batchId,
      process_type: 'actual',
      machine: actualProcess.machine || null,
      liquor_ratio: actualProcess.liquor_ratio || null,
      temperature: actualProcess.temperature || null,
      time_minutes: actualProcess.time_minutes || null,
      ph: actualProcess.ph || null,
    };

    if (existingProcess) {
      await supabase.from('dye_batch_process').update(processRow).eq('id', existingProcess.id);
    } else {
      await supabase.from('dye_batch_process').insert([processRow]);
    }
  }

  await supabase.from('dye_batches').update({ lifecycle_status: 'PRODUCTION_COMPLETED' }).eq('id', batchId);

  return { success: true, batch_id: batchId };
}

async function recordShadeResult(batchId, measuredL, measuredA, measuredB, metadata = {}) {
  const { data: targetShade, error: targetErr } = await supabase
    .from('dye_batch_target_shade').select('target_l, target_a, target_b').eq('batch_id', batchId).maybeSingle();

  if (targetErr && !isMissingTableError(targetErr)) throw targetErr;

  let calculatedDeltaE = null;
  if (targetShade && targetShade.target_l !== null) {
    calculatedDeltaE = parseFloat(deltaE76(
      targetShade.target_l, targetShade.target_a, targetShade.target_b,
      measuredL, measuredA, measuredB
    ).toFixed(4));
  }

  const resultRow = {
    batch_id: batchId,
    measured_l: measuredL,
    measured_a: measuredA,
    measured_b: measuredB,
    delta_e_76: calculatedDeltaE,
    measurement_instrument: metadata.instrument || 'Spectrophotometer',
    measurement_method: metadata.method || null,
    measurement_operator: metadata.operator || null,
    measurement_date: metadata.date || new Date().toISOString(),
    data_source: metadata.data_source || 'real_batch',
  };

  const { data, error } = await supabase
    .from('dye_batch_shade_results').insert([resultRow]).select().single();

  if (error) throw error;

  await supabase.from('dye_batches').update({ lifecycle_status: 'SHADE_VALIDATED' }).eq('id', batchId);

  return {
    success: true,
    result_id: data.id,
    batch_id,
    measured_lab: { L: measuredL, a: measuredA, b: measuredB },
    target_lab: targetShade ? { L: targetShade.target_l, a: targetShade.target_a, b: targetShade.target_b } : null,
    delta_e_76: calculatedDeltaE,
  };
}

async function calculateBatchIntelligence(batchId) {
  const { data: batch, error: batchErr } = await supabase
    .from('dye_batches').select('*').eq('id', batchId).single();
  if (!batch || batchErr) throw new Error(`Batch ${batchId} not found`);

  const [dyesRes, chemsRes, processRes, targetRes, resultsRes] = await Promise.all([
    supabase.from('dye_batch_dyes').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_chemicals').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_process').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batchId).maybeSingle(),
    supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batchId).order('created_at', { ascending: false }),
  ]);

  const dyes = dyesRes.data || [];
  const chemicals = chemsRes.data || [];
  const processes = processRes.data || [];
  const target = targetRes.data;
  const measured = (resultsRes.data || [])[0];
  const planned = processes.find(p => p.process_type === 'planned') || null;
  const actual = processes.find(p => p.process_type === 'actual') || null;

  const deviations = { recipe: [], process: [], shade: null };
  const missing = [];
  const warnings = [];

  for (const d of dyes) {
    if (d.planned_concentration != null && d.actual_concentration != null) {
      const diff = parseFloat((d.actual_concentration - d.planned_concentration).toFixed(4));
      if (diff !== 0) deviations.recipe.push({ type: 'dye_concentration', dye_name: d.dye_name, planned: d.planned_concentration, actual: d.actual_concentration, deviation: diff });
    } else if (d.planned_quantity_kg != null && d.actual_quantity_kg == null) missing.push(`actual quantity missing for dye ${d.dye_name || d.id}`);
  }

  for (const c of chemicals) {
    if (c.planned_dosage != null && c.actual_dosage != null) {
      const diff = parseFloat((c.actual_dosage - c.planned_dosage).toFixed(4));
      if (diff !== 0) deviations.process.push({ type: 'chemical_dosage', chemical_name: c.chemical_name, planned: c.planned_dosage, actual: c.actual_dosage, deviation: diff, unit: c.unit });
    } else if (c.planned_dosage != null && c.actual_dosage == null) missing.push(`actual dosage missing for chemical ${c.chemical_name || c.id}`);
  }

  if (planned && actual) {
    for (const k of ['temperature', 'time_minutes', 'liquor_ratio', 'ph']) {
      if (planned[k] != null && actual[k] != null) {
        const diff = parseFloat((Number(actual[k]) - Number(planned[k])).toFixed(4));
        if (diff !== 0) deviations.process.push({ type: 'process_parameter', parameter: k, planned: planned[k], actual: actual[k], deviation: diff });
      } else if (planned[k] != null && actual[k] == null) missing.push(`actual ${k} not recorded`);
    }
  } else {
    if (!planned) missing.push('planned process not recorded');
    if (!actual) missing.push('actual process not recorded');
  }

  if (target && measured && measured.measured_l != null) {
    const dE = measured.delta_e_76 != null ? measured.delta_e_76 : (target.target_l != null ? parseFloat(deltaE76(target.target_l, target.target_a, target.target_b, measured.measured_l, measured.measured_a, measured.measured_b).toFixed(4)) : null);
    deviations.shade = { target_lab: { L: target.target_l, a: target.target_a, b: target.target_b }, measured_lab: { L: measured.measured_l, a: measured.measured_a, b: measured.measured_b }, delta_e_76: dE };
  } else {
    if (!target) missing.push('target shade not recorded');
    if (!measured) missing.push('measured Lab* not recorded');
  }

  if (deviations.process.length > 0) warnings.push(`${deviations.process.length} process/recipe deviation(s) detected between planned and actual.`);

  await supabase.from('dye_batches').update({ lifecycle_status: 'WASTEWATER_ANALYSIS' }).eq('id', batchId);

  return {
    batch_id: batchId,
    deviations,
    missing_information: missing,
    warnings,
    planned_process: planned,
    actual_process: actual,
    potential_factors: getPotentialContributingFactors(deviations),
  };
}

function getPotentialContributingFactors(deviations) {
  const factors = [];
  if (deviations.recipe && deviations.recipe.length > 0) {
    factors.push({ category: 'recipe', description: 'Dye concentration deviates from planned recipe', items: deviations.recipe.map(d => d.dye_name || d.type) });
  }
  if (deviations.process && deviations.process.length > 0) {
    factors.push({ category: 'process', description: 'Process parameters differ from planned values', items: deviations.process.map(d => d.parameter || d.type) });
  }
  if (deviations.shade) {
    factors.push({ category: 'shade', description: 'Measured shade differs from target', items: [`ΔE76: ${deviations.shade.delta_e_76}`] });
  }
  return factors;
}

async function createWastewaterPrediction(batchId) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const plannedProc = (dossier.process || []).find(p => p.process_type === 'planned') || {};
  const prediction = predictWastewaterProfile({
    recipe: {
      dye_class: dossier.dye_class,
      dyes: dossier.dyes || [],
      chemicals: dossier.chemicals || [],
    },
    process: {
      liquor_ratio: plannedProc.liquor_ratio,
      temperature: plannedProc.temperature,
      time_minutes: plannedProc.time_minutes,
      ph: plannedProc.ph,
    },
    batch: {
      fabric_weight_kg: dossier.fabric_weight_kg,
      gsm: dossier.gsm,
      machine_id: dossier.machine,
    },
  });

  try {
    await supabase.from('wastewater_predictions').upsert([{
      batch_id: dossier.id,
      prediction_status: prediction.prediction_status,
      predicted_profile: prediction.predicted_profile,
      engineering_estimates: prediction.engineering_estimates,
      model_versions: prediction.model_versions,
      warnings: prediction.warnings,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'batch_id' });
  } catch (err) {
    console.warn('[Wastewater] DB persist skipped:', err.message);
  }

  return { success: true, batch_id: batchId, prediction };
}

async function recordWastewaterMeasurement(batchId, measurements, metadata = {}) {
  const { data: batch, error: batchErr } = await supabase
    .from('dye_batches').select('id').eq('id', batchId).maybeSingle();
  if (!batch || batchErr) throw new Error(`Batch ${batchId} not found`);

  const measurementRows = measurements.map(m => ({
    batch_id: batchId,
    parameter: m.parameter,
    value: m.value,
    unit: m.unit,
    timestamp: metadata.timestamp || new Date().toISOString(),
    data_source: metadata.data_source || 'manual_lab',
    quality: metadata.quality || 'validated',
  }));

  const { data, error } = await supabase
    .from('wastewater_measurements').insert(measurementRows).select();

  if (error) {
    if (isMissingTableError(error)) {
      return createWastewaterMeasurementFallback(batchId, measurements, metadata);
    }
    throw error;
  }

  await supabase.from('dye_batches').update({ lifecycle_status: 'ETP_RECOMMENDATION' }).eq('id', batchId);

  return { success: true, batch_id: batchId, measurements: data };
}

async function createWastewaterMeasurementFallback(batchId, measurements, metadata) {
  const rows = measurements.map(m => ({
    batch_id: batchId,
    parameter: m.parameter,
    value: m.value,
    unit: m.unit,
    timestamp: metadata.timestamp || new Date().toISOString(),
    data_source: metadata.data_source || 'manual_lab',
    quality: metadata.quality || 'validated',
  }));

  // Store in JSONB column as fallback
  const { data: batch } = await supabase.from('dye_batches').select('notes').eq('id', batchId).maybeSingle();
  let notes = {};
  try { if (batch?.notes?.startsWith('{')) notes = JSON.parse(batch.notes); } catch {}
  notes.wastewater_measurements = rows;
  await supabase.from('dye_batches').update({ notes: JSON.stringify(notes) }).eq('id', batchId);

  return { success: true, batch_id: batchId, measurements: rows, fallback: true };
}

async function compareExpectedVsActual(batchId) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const prediction = dossier.prediction || dossier.comparison;
  const telemetry = dossier.telemetry || [];

  if (!prediction || !telemetry || telemetry.length === 0) {
    return { status: 'INSUFFICIENT_DATA', message: 'No prediction or telemetry data available.' };
  }

  const comparison = calculateExpectedVsActual(prediction, telemetry);
  return { success: true, batch_id: batchId, comparison };
}

async function generateETPRecommendation(batchId) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const etpInput = {
    recipe: {
      dye_class: dossier.dye_class,
      liquor_ratio: dossier.confirmed_recipe?.process_parameters?.liquor_ratio || '1:10',
      fabric_weight_kg: dossier.fabric_weight_kg,
    },
    wastewater_profile: {
      pH: dossier.comparison?.comparisons?.find(c => c.metric === 'pH')?.actual ?? null,
      TDS: dossier.comparison?.comparisons?.find(c => c.metric === 'TDS')?.actual ?? null,
      COD: dossier.prediction?.predicted_profile?.COD ?? null,
      turbidity: dossier.comparison?.comparisons?.find(c => c.metric === 'Turbidity')?.actual ?? null,
    },
    plant_config: { jar_test_data: 'Standard Industrial Calibration Reference' },
    batch_id: batchId,
  };

  const decision = evaluateEtpDecision(etpInput);

  const recommendation = {
    batch_id: batchId,
    ...decision,
    lineage: {
      batch_id: batchId,
      fabric: dossier.fabric_type,
      dye_class: dossier.dye_class,
      actual_ph: etpInput.wastewater_profile.pH,
      expected_ph: dossier.comparison?.comparisons?.find(c => c.metric === 'pH')?.expected,
      comparison_status: dossier.comparison?.status || 'NORMAL',
    },
    generated_at: new Date().toISOString(),
    evidence_level: 'advisory_reference_range',
    human_validation_status: 'pending',
  };

  try {
    await supabase.from('etp_recommendations').upsert([{
      batch_id: dossier.id,
      recommendation_status: recommendation.recommendation_status || 'advisory_generated',
      recommendation: recommendation.recommendation,
      reason: recommendation.reason,
      evidence: JSON.stringify(recommendation.evidence || []),
      dosing: JSON.stringify(recommendation.dosing || {}),
      strategies: JSON.stringify(recommendation.strategies || []),
      rules: JSON.stringify(recommendation.rules || []),
      warnings: JSON.stringify(recommendation.warnings || []),
      water_reuse_suitability: JSON.stringify(recommendation.water_reuse_suitability || {}),
    }], { onConflict: 'batch_id' });
  } catch (err) {
    console.warn('[ETP] DB persist skipped:', err.message);
  }

  await supabase.from('dye_batches').update({ lifecycle_status: 'ETP_RECOMMENDATION' }).eq('id', batchId);

  return recommendation;
}

async function evaluateTrainingReadiness(batchId) {
  const { data: batch, error: batchErr } = await supabase
    .from('dye_batches').select('*').eq('id', batchId).single();
  if (!batch || batchErr) throw new Error(`Batch ${batchId} not found`);

  const [_targetRes, resultsRes] = await Promise.all([
    supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batchId).maybeSingle(),
    supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batchId),
  ]);

  const shadeResult = (resultsRes.data || []).find(r => r.data_source === 'real_batch');
  const issues = [];

  if (batch.data_quality_status === 'draft' || batch.data_quality_status === 'incomplete') {
    issues.push('data_quality_status is ' + batch.data_quality_status);
  }
  if (batch.data_source === 'reference_recipe' || batch.data_source === 'synthetic') {
    issues.push('data_source=' + batch.data_source + ' is not eligible');
  }
  if (batch.data_source === 'production_order') {
    issues.push('data_source=production_order is not eligible for supervised training');
  }
  if (!shadeResult) {
    issues.push('missing measured Lab result');
  } else {
    if (shadeResult.measured_l === null) issues.push('measured_L is null');
    if (shadeResult.measured_a === null) issues.push('measured_a is null');
    if (shadeResult.measured_b === null) issues.push('measured_b is null');
  }
  if (!batch.fiber_composition) issues.push('missing fiber_composition');
  if (!batch.fabric_type) issues.push('missing fabric_type');
  if (!batch.dye_class) issues.push('missing dye_class');

  const training_ready = issues.length === 0;
  const eligibility = training_ready ? 'ELIGIBLE' : 'NOT_ELIGIBLE';

  return {
    batch_id: batchId,
    training_ready,
    eligibility,
    issues,
    data_quality_status: batch.data_quality_status,
    data_source: batch.data_source,
    has_measured_lab: !!shadeResult,
    delta_e_76: shadeResult ? shadeResult.delta_e_76 : null,
  };
}

async function generateBatchReport(batchId) {
  const dossier = await getBatchDossier(batchId);
  if (!dossier) throw new Error(`Batch ${batchId} not found`);

  const batch = dossier;
  const trainingReadiness = await evaluateTrainingReadiness(batchId);

  const report = {
    report_id: `RPT-${batchId}-${Date.now()}`,
    batch_id: batchId,
    generated_at: new Date().toISOString(),
    production_order: {
      order_number: batch.order_number || 'N/A',
      customer: batch.customer || 'Internal Production',
      fabric_type: batch.fabric_type,
      fiber_composition: batch.fiber_composition,
      batch_weight_kg: batch.fabric_weight_kg,
      gsm: batch.gsm,
      dye_class: batch.dye_class,
      machine: batch.machine,
      target_shade: batch.target_shade,
    },
    optimization: {
      session_id: batch.optimization_id,
      status: batch.optimization_session?.status || 'N/A',
      recommended_recipe: batch.confirmed_recipe,
    },
    recipe: {
      planned_dyes: batch.dyes || [],
      planned_chemicals: batch.chemicals || [],
      planned_process: (batch.process || []).filter(p => p.process_type === 'planned'),
      actual_process: (batch.process || []).filter(p => p.process_type === 'actual'),
    },
    shade: {
      target: batch.target_shade,
      measured: batch.shade_result,
      delta_e_76: batch.shade_result?.delta_e_76 || null,
    },
    wastewater: {
      prediction: batch.prediction,
      measurements: batch.telemetry || [],
      comparison: batch.comparison,
    },
    deviations: {
      recipe: dossier.deviations?.recipe || [],
      process: dossier.deviations?.process || [],
      shade: dossier.deviations?.shade || null,
      missing_information: dossier.missing_information || [],
      warnings: dossier.warnings || [],
    },
    etp_recommendation: batch.etp_recommendation,
    training_readiness: trainingReadiness,
    lifecycle_status: batch.lifecycle_status,
    data_quality_status: batch.data_quality_status,
    data_source: batch.data_source,
    model_status: 'not_available',
    kb_rules_evaluated: 13,
    kb_rule_status: 'pending_human_validation',
  };

  return report;
}

function calculateExpectedVsActual(prediction, telemetry) {
  if (!telemetry || telemetry.length === 0) {
    return { status: 'INSUFFICIENT_DATA', note: 'No sensor telemetry recorded for this batch.', comparisons: [] };
  }

  const latestBySensor = {};
  for (const row of telemetry) {
    if (!latestBySensor[row.sensor_id]) latestBySensor[row.sensor_id] = row;
  }

  const est = prediction?.engineering_estimates || {};
  const pred = prediction?.predicted_profile || {};
  const metrics = [
    { metric: 'pH', unit: 'pH units', expected: est.expected_bath_pH ?? pred.pH ?? 7.0, actual: latestBySensor['ph'] ? Number(latestBySensor['ph'].value) : null, tolerance: 1.0 },
    { metric: 'Temperature', unit: '°C', expected: 60.0, actual: latestBySensor['temperature'] ? Number(latestBySensor['temperature'].value) : null, tolerance: 5.0 },
    { metric: 'TDS', unit: 'ppm', expected: pred.TDS ?? null, actual: latestBySensor['tds'] ? Number(latestBySensor['tds'].value) : null, tolerance: 200 },
    { metric: 'Turbidity', unit: 'NTU', expected: pred.turbidity ?? null, actual: latestBySensor['turbidity'] ? Number(latestBySensor['turbidity'].value) : null, tolerance: 20 },
  ];

  let overallStatus = 'NORMAL';
  const comparisons = [];
  for (const m of metrics) {
    if (m.actual === null || m.expected === null) {
      comparisons.push({ ...m, deviation: null, deviation_pct: null, status: m.actual === null ? 'NO_ACTUAL' : 'NO_EXPECTED' });
      continue;
    }
    const diff = m.actual - m.expected;
    const pct = m.expected !== 0 ? ((diff / m.expected) * 100) : 0;
    let status = 'NORMAL';
    if (Math.abs(pct) > 30) { status = 'HIGH_DEVIATION'; overallStatus = 'HIGH_DEVIATION'; }
    else if (Math.abs(pct) > 15) { status = 'MINOR_DEVIATION'; if (overallStatus !== 'HIGH_DEVIATION') overallStatus = 'MINOR_DEVIATION'; }
    comparisons.push({ ...m, deviation: parseFloat(diff.toFixed(2)), deviation_pct: parseFloat(pct.toFixed(1)), status });
  }

  return { status: overallStatus, evaluated_at: new Date().toISOString(), total_telemetry_records: telemetry.length, comparisons };
}

module.exports = {
  createProductionOrder,
  createOptimizationFromOrder,
  createOptimizationFromBatch,
  useRecommendedRecipe,
  createBatchFromOptimization,
  recordActualRecipe,
  recordShadeResult,
  calculateBatchIntelligence,
  createWastewaterPrediction,
  recordWastewaterMeasurement,
  compareExpectedVsActual,
  generateETPRecommendation,
  evaluateTrainingReadiness,
  generateBatchReport,
  getPotentialContributingFactors,
};
