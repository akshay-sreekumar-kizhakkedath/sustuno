const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const RECIPES_FILE = path.join(__dirname, '..', '..', '..', 'mater_knowledge_base', 'source_json', 'Standard_Recipes_Master_Dataset.json');

let recipesCache = null;
async function loadRecipes() {
  if (recipesCache) return recipesCache;
  const raw = await fs.readFile(RECIPES_FILE, 'utf-8');
  recipesCache = JSON.parse(raw);
  return recipesCache;
}

function norm(s) { return (s || '').toString().toLowerCase(); }
function tokens(s) { return norm(s).split(/[^a-z0-9]+/).filter(t => t.length > 2); }
function overlapScore(a, b) {
  const ta = tokens(a); const tb = new Set(tokens(b));
  if (!ta.length) return 0;
  const hit = ta.filter(t => tb.has(t)).length;
  return hit / ta.length;
}
function parseKg(s, fallback) {
  const m = String(s || '').match(/([\d.]+)\s*kg/i);
  return m ? parseFloat(m[1]) : fallback;
}
function parseRatio(s) {
  const m = String(s || '').match(/1\s*:\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : 8;
}
function parseDyes(dyeName) {
  const out = [];
  const re = /([A-Za-z][A-Za-z0-9 .\-/()]+?)\s*\(\s*([\d.]+)\s*%\s*owf\s*\)/g;
  let m;
  while ((m = re.exec(dyeName || '')) !== null) out.push({ name: m[1].trim(), pct: parseFloat(m[2]) });
  return out;
}
function parseDosageGL(s) {
  const m = String(s || '').match(/([\d.]+)\s*g\/l/i);
  return m ? parseFloat(m[1]) : null;
}
function inputsToMap(inputs) {
  const map = {};
  for (const i of inputs || []) map[norm(i.parameter_name).replace(/\s+/g, '_')] = i.parameter_value;
  return map;
}
function pickInput(map, ...keys) {
  for (const k of keys) {
    for (const mk of Object.keys(map)) {
      if (mk.includes(k)) return map[mk];
    }
  }
  return null;
}

// Import repositories
const { 
  dyeOptSessionRepository,
  dyeOptInputRepository,
  dyeOptOutputRepository,
  dyeOptConstraintRepository
} = require('../database/repositories');

const { optimizeRecipe } = require('../services/dyeOptimization/optimizer');

// ========== AI DYE OPTIMIZATION ENDPOINT ==========
router.post('/dye-recipe', async (req, res) => {
  try {
    const result = await optimizeRecipe(req.body || {});
    if (result.status === 'failed') {
      const validationFailed = Array.isArray(result.errors) && result.errors.length > 0;
      return res.status(validationFailed ? 400 : 422).json({
        success: false,
        error: {
          code: validationFailed ? 'INVALID_REQUEST' : 'OPTIMIZATION_FAILED',
          message: result.message || 'Optimization failed.',
          details: result.errors || [],
        },
      });
    }
    res.status(200).json({ success: true, optimization: result });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ success: false, error: { code: 'OPTIMIZATION_ERROR', message: error.message || 'Optimization failed.' } });
  }
});

router.get('/dye-recipe/:id', async (req, res) => {
  // Prototype retrieval: return basic acknowledgment; full retrieval requires persistence implementation.
  res.json({ success: true, message: 'Retrieval endpoint available; persistence may need DB session lookup.', id: req.params.id });
});

// ========== SESSION ENDPOINTS ==========

// Create a new optimization session
router.post('/sessions', async (req, res) => {
  try {
    const sessionData = {
      batch_id: req.body.batch_id,
      session_name: req.body.session_name,
      objective: req.body.objective, // e.g., 'minimize_cost', 'maximize_shade_match'
      status: req.body.status || 'pending'
    };

    // Validate required fields
    if (!sessionData.batch_id) {
      return res.status(400).json({ error: 'batch_id is required' });
    }
    if (!sessionData.objective) {
      return res.status(400).json({ error: 'objective is required' });
    }

    const session = await dyeOptSessionRepository.create(sessionData);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating optimization session:', error);
    res.status(500).json({ error: 'Failed to create optimization session' });
  }
});

// Get all sessions with optional filtering
router.get('/sessions', async (req, res) => {
  try {
    const filters = {};
    if (req.query.batch_id) filters.batch_id = req.query.batch_id;
    if (req.query.status) filters.status = req.query.status;
    
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const sessions = await dyeOptSessionRepository.list(filters, limit, offset);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching optimization sessions:', error);
    res.status(500).json({ error: 'Failed to fetch optimization sessions' });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await dyeOptSessionRepository.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Optimization session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching optimization session:', error);
    res.status(500).json({ error: 'Failed to fetch optimization session' });
  }
});

// Update session by ID
router.put('/sessions/:id', async (req, res) => {
  try {
    const updateData = {};
    if (req.body.session_name !== undefined) updateData.session_name = req.body.session_name;
    if (req.body.objective !== undefined) updateData.objective = req.body.objective;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    
    const session = await dyeOptSessionRepository.update(req.params.id, updateData);
    res.json(session);
  } catch (error) {
    console.error('Error updating optimization session:', error);
    res.status(500).json({ error: 'Failed to update optimization session' });
  }
});

// Delete session by ID
router.delete('/sessions/:id', async (req, res) => {
  try {
    await dyeOptSessionRepository.delete(req.params.id);
    res.json({ success: true, message: 'Optimization session deleted' });
  } catch (error) {
    console.error('Error deleting optimization session:', error);
    res.status(500).json({ error: 'Failed to delete optimization session' });
  }
});

// ========== INPUT ENDPOINTS ==========

// Add input to a session
router.post('/sessions/:sessionId/inputs', async (req, res) => {
  try {
    const inputData = {
      session_id: req.params.sessionId,
      parameter_name: req.body.parameter_name,
      parameter_value: req.body.parameter_value,
      parameter_type: req.body.parameter_type,
      unit: req.body.unit
    };

    // Validate required fields
    if (!inputData.parameter_name) {
      return res.status(400).json({ error: 'parameter_name is required' });
    }

    const input = await dyeOptInputRepository.create(inputData);
    res.status(201).json(input);
  } catch (error) {
    console.error('Error adding input to session:', error);
    res.status(500).json({ error: 'Failed to add input to session' });
  }
});

// Add multiple inputs to a session
router.post('/sessions/:sessionId/inputs/batch', async (req, res) => {
  try {
    const inputs = req.body.inputs.map(input => ({
      session_id: req.params.sessionId,
      parameter_name: input.parameter_name,
      parameter_value: input.parameter_value,
      parameter_type: input.parameter_type,
      unit: input.unit
    }));

    // Validate inputs
    const invalidInputs = inputs.filter(input => !input.parameter_name);
    if (invalidInputs.length > 0) {
      return res.status(400).json({ error: 'parameter_name is required for all inputs' });
    }

    const createdInputs = await dyeOptInputRepository.createMany(inputs);
    res.status(201).json(createdInputs);
  } catch (error) {
    console.error('Error adding inputs to session:', error);
    res.status(500).json({ error: 'Failed to add inputs to session' });
  }
});

// Get all inputs for a session
router.get('/sessions/:sessionId/inputs', async (req, res) => {
  try {
    const inputs = await dyeOptInputRepository.findBySessionId(req.params.sessionId);
    res.json(inputs);
  } catch (error) {
    console.error('Error fetching inputs for session:', error);
    res.status(500).json({ error: 'Failed to fetch inputs for session' });
  }
});

// ========== OUTPUT ENDPOINTS ==========

// Add output to a session
router.post('/sessions/:sessionId/outputs', async (req, res) => {
  try {
    const outputData = {
      session_id: req.params.sessionId,
      recipe_component: req.body.recipe_component,
      recommended_amount: req.body.recommended_amount,
      unit: req.body.unit,
      confidence_score: req.body.confidence_score,
      rank: req.body.rank
    };

    // Validate required fields
    if (!outputData.recipe_component) {
      return res.status(400).json({ error: 'recipe_component is required' });
    }
    if (outputData.recommended_amount === undefined) {
      return res.status(400).json({ error: 'recommended_amount is required' });
    }

    const output = await dyeOptOutputRepository.create(outputData);
    res.status(201).json(output);
  } catch (error) {
    console.error('Error adding output to session:', error);
    res.status(500).json({ error: 'Failed to add output to session' });
  }
});

// Add multiple outputs to a session
router.post('/sessions/:sessionId/outputs/batch', async (req, res) => {
  try {
    const outputs = req.body.outputs.map(output => ({
      session_id: req.params.sessionId,
      recipe_component: output.recipe_component,
      recommended_amount: output.recommended_amount,
      unit: output.unit,
      confidence_score: output.confidence_score,
      rank: output.rank
    }));

    // Validate outputs
    const invalidOutputs = outputs.filter(output => 
      !output.recipe_component || output.recommended_amount === undefined
    );
    if (invalidOutputs.length > 0) {
      return res.status(400).json({ error: 'recipe_component and recommended_amount are required for all outputs' });
    }

    const createdOutputs = await dyeOptOutputRepository.createMany(outputs);
    res.status(201).json(createdOutputs);
  } catch (error) {
    console.error('Error adding outputs to session:', error);
    res.status(500).json({ error: 'Failed to add outputs to session' });
  }
});

// Get all outputs for a session
router.get('/sessions/:sessionId/outputs', async (req, res) => {
  try {
    const outputs = await dyeOptOutputRepository.findBySessionId(req.params.sessionId);
    res.json(outputs);
  } catch (error) {
    console.error('Error fetching outputs for session:', error);
    res.status(500).json({ error: 'Failed to fetch outputs for session' });
  }
});

// ========== CONSTRAINT ENDPOINTS ==========

// Add constraint to a session
router.post('/sessions/:sessionId/constraints', async (req, res) => {
  try {
    const constraintData = {
      session_id: req.params.sessionId,
      constraint_type: req.body.constraint_type,
      constraint_value: req.body.constraint_value,
      operator: req.body.operator
    };

    // Validate required fields
    if (!constraintData.constraint_type) {
      return res.status(400).json({ error: 'constraint_type is required' });
    }
    if (!constraintData.constraint_value) {
      return res.status(400).json({ error: 'constraint_value is required' });
    }
    if (!constraintData.operator) {
      return res.status(400).json({ error: 'operator is required' });
    }

    const constraint = await dyeOptConstraintRepository.create(constraintData);
    res.status(201).json(constraint);
  } catch (error) {
    console.error('Error adding constraint to session:', error);
    res.status(500).json({ error: 'Failed to add constraint to session' });
  }
});

// Add multiple constraints to a session
router.post('/sessions/:sessionId/constraints/batch', async (req, res) => {
  try {
    const constraints = req.body.constraints.map(constraint => ({
      session_id: req.params.sessionId,
      constraint_type: constraint.constraint_type,
      constraint_value: constraint.constraint_value,
      operator: constraint.operator
    }));

    // Validate constraints
    const invalidConstraints = constraints.filter(constraint => 
      !constraint.constraint_type || !constraint.constraint_value || !constraint.operator
    );
    if (invalidConstraints.length > 0) {
      return res.status(400).json({ error: 'constraint_type, constraint_value, and operator are required for all constraints' });
    }

    const createdConstraints = await dyeOptConstraintRepository.createMany(constraints);
    res.status(201).json(createdConstraints);
  } catch (error) {
    console.error('Error adding constraints to session:', error);
    res.status(500).json({ error: 'Failed to add constraints to session' });
  }
});

// Get all constraints for a session
router.get('/sessions/:sessionId/constraints', async (req, res) => {
  try {
    const constraints = await dyeOptConstraintRepository.findBySessionId(req.params.sessionId);
    res.json(constraints);
  } catch (error) {
    console.error('Error fetching constraints for session:', error);
    res.status(500).json({ error: 'Failed to fetch constraints for session' });
  }
});

// ========== OPTIMIZATION WORKFLOW ENDPOINTS ==========

// Start optimization: KB recipe matcher + batch scaling + constraint check
router.post('/sessions/:sessionId/start', async (req, res) => {
  try {
    await dyeOptSessionRepository.update(req.params.sessionId, { status: 'running' });
    const session = await dyeOptSessionRepository.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Optimization session not found' });

    const inputs = await dyeOptInputRepository.findBySessionId(req.params.sessionId);
    const constraints = await dyeOptConstraintRepository.findBySessionId(req.params.sessionId);
    const map = inputsToMap(inputs);

    const inFabric = pickInput(map, 'fabric', 'fiber', 'material') || '';
    const inDye = pickInput(map, 'dye', 'colorant', 'dye_class') || '';
    const inShade = pickInput(map, 'shade', 'colour', 'color') || '';
    const inMachine = pickInput(map, 'machine') || '';
    const inBatchRaw = pickInput(map, 'batch', 'weight', 'quantity', 'kg');
    const inBatchKg = parseFloat(inBatchRaw) || 100;
    const objective = norm(session.objective || req.body.objective || 'shade_match');

    const recipes = await loadRecipes();
    const scored = recipes.map(r => {
      const b = r.basic_information || {};
      const d = r.dye_information || {};
      const m = r.machine_requirement || {};
      const fiberScore = inFabric ? overlapScore(inFabric, b.fabric_type) : 0.5;
      const dyeScore = inDye ? (overlapScore(inDye, d.dye_type) * 0.5 + overlapScore(inDye, d.dye_name) * 0.5) : 0.5;
      const shadeScore = inShade ? (overlapScore(inShade, b.shade_name) * 0.7 + overlapScore(inShade, b.shade_depth) * 0.3) : 0.5;
      const machineScore = inMachine ? overlapScore(inMachine, m.machine_type) : 0.5;
      let total = fiberScore * 0.4 + dyeScore * 0.25 + shadeScore * 0.2 + machineScore * 0.15;
      if (objective.includes('cost') || objective.includes('effluent') || objective.includes('minimize')) {
        const dyePct = parseDyes(d.dye_name).reduce((s, x) => s + x.pct, 0);
        total -= (dyePct / 100) * 0.05;
      }
      return { recipe: r, scores: { fiber: fiberScore, dye: dyeScore, shade: shadeScore, machine: machineScore }, total };
    }).sort((a, b) => b.total - a.total);

    const top = scored[0];
    if (!top || top.total < 0.15) {
      await dyeOptSessionRepository.update(req.params.sessionId, { status: 'failed' });
      return res.status(404).json({ error: 'No matching recipe in KB', tried: scored.length });
    }

    const rb = top.recipe.basic_information;
    const rd = top.recipe.dye_information;
    const rp = top.recipe.process_parameters || {};
    const chems = top.recipe.chemical_information || [];
    const refKg = parseKg(rb.fabric_weight, 100);
    const scale = inBatchKg / refKg;
    const ratio = parseRatio(pickInput(map, 'liquor', 'mlr') || rp.liquor_ratio);
    const liquorL = inBatchKg * ratio;

    const violations = [];
    for (const c of constraints || []) {
      const t = norm(c.constraint_type); const v = norm(String(c.constraint_value)); const op = c.operator;
      const chemNames = chems.map(x => norm(x.chemical_name)).join(' | ');
      if (t.includes('prohibit') || t.includes('ban')) {
        if (v && chemNames.includes(v)) violations.push(`Prohibited chemical ${c.constraint_value} present in ${rb.recipe_id}`);
      }
      if (t.includes('max_temp') || t.includes('temperature')) {
        const temps = (rp.temperature_profile || '').match(/([\d.]+)\s*°c/gi) || [];
        const maxT = Math.max(...temps.map(x => parseFloat(x)), 0);
        const lim = parseFloat(v);
        if (lim && maxT > lim && (op === '<=' || op === '<' || op === 'max')) violations.push(`Recipe max ${maxT}C exceeds limit ${lim}C`);
      }
    }
    for (const ch of chems) {
      const incompat = norm(ch.incompatible_chemicals || '');
      for (const c of constraints || []) {
        if (incompat && norm(String(c.constraint_value)) && incompat.includes(norm(String(c.constraint_value)))) {
          violations.push(`Incompatibility: ${ch.chemical_name} vs ${c.constraint_value}`);
        }
      }
    }

    const confidence = top.total > 0.75 ? 0.9 : top.total > 0.5 ? 0.75 : 0.55;
    const outputs = [];
    let rank = 1;
    for (const dye of parseDyes(rd.dye_name)) {
      outputs.push({
        session_id: req.params.sessionId,
        recipe_component: `${dye.name} [${rb.recipe_id}]`,
        recommended_amount: +(dye.pct / 100 * inBatchKg).toFixed(3),
        unit: 'kg',
        confidence_score: confidence,
        rank: rank++
      });
    }
    for (const ch of chems) {
      const gL = parseDosageGL(ch.dosage);
      if (gL == null) continue;
      outputs.push({
        session_id: req.params.sessionId,
        recipe_component: `${ch.chemical_name} [${rb.recipe_id}]`,
        recommended_amount: +(gL * liquorL / 1000).toFixed(3),
        unit: 'kg',
        confidence_score: confidence,
        rank: rank++
      });
    }
    outputs.push({
      session_id: req.params.sessionId,
      recipe_component: `Water @ ${rp.liquor_ratio || '1:' + ratio} [${rb.recipe_id}]`,
      recommended_amount: +liquorL.toFixed(1),
      unit: 'L',
      confidence_score: confidence,
      rank: rank++
    });

    await dyeOptOutputRepository.deleteBySessionId(req.params.sessionId);
    await dyeOptOutputRepository.createMany(outputs);
    await dyeOptSessionRepository.update(req.params.sessionId, { status: violations.length ? 'completed_with_warnings' : 'completed' });

    res.json({
      message: 'Optimization completed (KB matcher)',
      session_id: req.params.sessionId,
      recipe_id: rb.recipe_id,
      recipe_name: rb.recipe_name,
      match_score: +top.total.toFixed(3),
      score_breakdown: top.scores,
      scaling: { batch_kg: inBatchKg, reference_kg: refKg, scale_factor: +scale.toFixed(3), liquor_L: +liquorL.toFixed(1) },
      violations,
      outputs_count: outputs.length
    });
  } catch (error) {
    console.error('Error starting optimization:', error);
    try { await dyeOptSessionRepository.update(req.params.sessionId, { status: 'failed' }); } catch {}
    res.status(500).json({ error: 'Failed to start optimization', detail: error.message });
  }
});

// Get optimization results for a session
router.get('/sessions/:sessionId/results', async (req, res) => {
  try {
    const session = await dyeOptSessionRepository.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Optimization session not found' });
    }
    
    const inputs = await dyeOptInputRepository.findBySessionId(req.params.sessionId);
    const outputs = await dyeOptOutputRepository.findBySessionId(req.params.sessionId);
    const constraints = await dyeOptConstraintRepository.findBySessionId(req.params.sessionId);
    
    res.json({
      session,
      inputs,
      outputs,
      constraints
    });
  } catch (error) {
    console.error('Error fetching optimization results:', error);
    res.status(500).json({ error: 'Failed to fetch optimization results' });
  }
});

module.exports = router;