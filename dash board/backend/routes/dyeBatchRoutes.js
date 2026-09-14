// Dye Batch Data Collection Routes
// Records real dyeing experiments for ML training data collection.
// These endpoints feed the data pipeline that will eventually train the shade prediction model.

const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { buildDyeTrainingDataset } = require('../services/dyeOptimization/datasetBuilder');
const { deltaE76 } = require('../services/dyeOptimization/deltaE');
const { isMissingTableError, NOT_PROVISIONED_NOTE } = require('../database/schemaGuard');

// ========== CREATE BATCH ==========

// POST /api/dye-batches
// Create a new dyeing batch record (planned values at experiment start)
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};

    // Required: fiber_composition and fabric_type
    if (!body.fiber_composition) {
      return res.status(400).json({ success: false, error: 'fiber_composition is required' });
    }
    if (!body.fabric_type) {
      return res.status(400).json({ success: false, error: 'fabric_type is required' });
    }

    const batchRow = {
      optimization_id: body.optimization_id || null,
      data_source: body.data_source || 'real_batch',
      data_quality_status: 'draft',
      fiber_composition: body.fiber_composition,
      fabric_type: body.fabric_type,
      gsm: body.gsm || null,
      fabric_weight_kg: body.fabric_weight_kg || null,
      dye_class: body.dye_class || null,
      batch_date: body.batch_date || null,
      machine: body.machine || null,
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('dye_batches')
      .insert([batchRow])
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      throw error;
    }

    // Insert dyes if provided
    if (Array.isArray(body.dyes) && body.dyes.length > 0) {
      const dyeRows = body.dyes.map(d => ({
        batch_id: data.id,
        dye_id: d.dye_id || null,
        dye_name: d.dye_name || null,
        planned_concentration: d.planned_concentration || null,
        actual_concentration: null,
        planned_quantity_kg: d.planned_quantity_kg || null,
        actual_quantity_kg: null,
      }));
      const { error: dyeErr } = await supabase.from('dye_batch_dyes').insert(dyeRows);
      if (dyeErr) console.error('Warning: dye insert failed:', dyeErr.message);
    }

    // Insert chemicals if provided
    if (Array.isArray(body.chemicals) && body.chemicals.length > 0) {
      const chemRows = body.chemicals.map(c => ({
        batch_id: data.id,
        chemical_id: c.chemical_id || null,
        chemical_name: c.chemical_name || null,
        planned_dosage: c.planned_dosage || null,
        actual_dosage: null,
        unit: c.unit || 'g/l',
        addition_stage: c.addition_stage || null,
      }));
      const { error: chemErr } = await supabase.from('dye_batch_chemicals').insert(chemRows);
      if (chemErr) console.error('Warning: chemical insert failed:', chemErr.message);
    }

    // Insert planned process if provided
    if (body.planned_process) {
      const pp = body.planned_process;
      const { error: ppErr } = await supabase.from('dye_batch_process').insert([{
        batch_id: data.id,
        process_type: 'planned',
        liquor_ratio: pp.liquor_ratio || null,
        temperature: pp.temperature || null,
        time_minutes: pp.time_minutes || null,
        ph: pp.ph || null,
        machine: pp.machine || null,
      }]);
      if (ppErr) console.error('Warning: planned process insert failed:', ppErr.message);
    }

    // Insert target shade if provided
    if (body.target_shade) {
      const ts = body.target_shade;
      const { error: tsErr } = await supabase.from('dye_batch_target_shade').insert([{
        batch_id: data.id,
        target_L: ts.L,
        target_a: ts.a,
        target_b: ts.b,
        shade_name: ts.shade_name || null,
        shade_code: ts.shade_code || null,
        shade_depth: ts.shade_depth || null,
      }]);
      if (tsErr) console.error('Warning: target shade insert failed:', tsErr.message);
    }

    res.status(201).json({ success: true, batch_id: data.id, data });
  } catch (err) {
    console.error('Error creating dye batch:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create batch' });
  }
});

// ========== GET BATCH ==========

// GET /api/dye-batches/:id
// Retrieve a batch with all related data
router.get('/:id', async (req, res) => {
  try {
    const { data: batch, error } = await supabase
      .from('dye_batches')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const [dyesRes, chemsRes, processRes, targetRes, resultsRes] = await Promise.all([
      supabase.from('dye_batch_dyes').select('*').eq('batch_id', batch.id),
      supabase.from('dye_batch_chemicals').select('*').eq('batch_id', batch.id),
      supabase.from('dye_batch_process').select('*').eq('batch_id', batch.id),
      supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batch.id).maybeSingle(),
      supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batch.id),
    ]);

    res.json({
      success: true,
      batch,
      dyes: dyesRes.data || [],
      chemicals: chemsRes.data || [],
      process: processRes.data || [],
      target_shade: targetRes.data || null,
      shade_results: resultsRes.data || [],
    });
  } catch (err) {
    console.error('Error fetching dye batch:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch batch' });
  }
});

// ========== UPDATE ACTUAL PROCESS ==========

// PUT /api/dye-batches/:id
// Update actual process values after the dyeing run completes
router.put('/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const batchId = req.params.id;

    // Verify batch exists
    const { data: existing, error: findErr } = await supabase
      .from('dye_batches')
      .select('id, data_quality_status')
      .eq('id', batchId)
      .single();

    if (findErr) {
      if (isMissingTableError(findErr)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    // Update top-level batch fields if provided
    const batchUpdates = {};
    if (body.dye_class !== undefined) batchUpdates.dye_class = body.dye_class;
    if (body.gsm !== undefined) batchUpdates.gsm = body.gsm;
    if (body.fabric_weight_kg !== undefined) batchUpdates.fabric_weight_kg = body.fabric_weight_kg;
    if (body.machine !== undefined) batchUpdates.machine = body.machine;
    if (body.notes !== undefined) batchUpdates.notes = body.notes;
    if (body.data_quality_status !== undefined) {
      const allowed = ['draft', 'incomplete', 'complete', 'validated', 'rejected'];
      if (!allowed.includes(body.data_quality_status)) {
        return res.status(400).json({ success: false, error: 'Invalid data_quality_status' });
      }
      batchUpdates.data_quality_status = body.data_quality_status;
    }

    if (Object.keys(batchUpdates).length > 0) {
      const { error: updateErr } = await supabase
        .from('dye_batches')
        .update(batchUpdates)
        .eq('id', batchId);
      if (updateErr) throw updateErr;
    }

    // Update actual dye concentrations if provided
    if (Array.isArray(body.actual_dyes)) {
      for (const d of body.actual_dyes) {
        if (!d.dye_name && !d.id) continue;
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

    // Upsert actual process parameters
    if (body.actual_process) {
      const ap = body.actual_process;
      const { data: existingProcess } = await supabase
        .from('dye_batch_process')
        .select('id')
        .eq('batch_id', batchId)
        .eq('process_type', 'actual')
        .maybeSingle();

      const processRow = {
        batch_id: batchId,
        process_type: 'actual',
        liquor_ratio: ap.liquor_ratio || null,
        temperature: ap.temperature || null,
        time_minutes: ap.time_minutes || null,
        ph: ap.ph || null,
        machine: ap.machine || null,
      };

      if (existingProcess) {
        await supabase.from('dye_batch_process').update(processRow).eq('id', existingProcess.id);
      } else {
        await supabase.from('dye_batch_process').insert([processRow]);
      }
    }

    res.json({ success: true, batch_id: batchId, updated: { ...batchUpdates, actual_process: !!body.actual_process, actual_dyes: !!(body.actual_dyes && body.actual_dyes.length) } });
  } catch (err) {
    console.error('Error updating dye batch:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update batch' });
  }
});

// ========== RECORD MEASURED SHADE ==========

// POST /api/dye-batches/:id/shade-result
// Record measured L*a*b* after spectrophotometer reading
router.post('/:id/shade-result', async (req, res) => {
  try {
    const body = req.body || {};
    const batchId = req.params.id;

    // Validate required fields
    if (body.measured_L === undefined || body.measured_a === undefined || body.measured_b === undefined) {
      return res.status(400).json({ success: false, error: 'measured_L, measured_a, measured_b are required' });
    }

    // Fetch target shade for delta-E calculation
    const { data: targetShade } = await supabase
      .from('dye_batch_target_shade')
      .select('target_L, target_a, target_b')
      .eq('batch_id', batchId)
      .maybeSingle();

    let calculatedDeltaE = null;
    if (targetShade && targetShade.target_L !== null) {
      calculatedDeltaE = parseFloat(deltaE76(
        targetShade.target_L, targetShade.target_a, targetShade.target_b,
        body.measured_L, body.measured_a, body.measured_b
      ).toFixed(4));
    }

    const resultRow = {
      batch_id: batchId,
      measured_L: body.measured_L,
      measured_a: body.measured_a,
      measured_b: body.measured_b,
      delta_e_76: calculatedDeltaE,
      measurement_instrument: body.measurement_instrument || null,
      measurement_method: body.measurement_method || null,
      measurement_date: body.measurement_date || null,
      measurement_operator: body.measurement_operator || null,
      sample_identifier: body.sample_identifier || null,
      measurement_temperature: body.measurement_temperature || null,
      measurement_notes: body.measurement_notes || null,
      data_source: body.data_source || 'real_batch',
    };

    const { data, error } = await supabase
      .from('dye_batch_shade_results')
      .insert([resultRow])
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      throw error;
    }

    // Auto-advance quality status to 'complete' if batch was still draft/incomplete
    await supabase
      .from('dye_batches')
      .update({ data_quality_status: 'complete' })
      .eq('id', batchId)
      .in('data_quality_status', ['draft', 'incomplete']);

    res.status(201).json({
      success: true,
      result_id: data.id,
      batch_id: batchId,
      measured_lab: { L: body.measured_L, a: body.measured_a, b: body.measured_b },
      delta_e_76: calculatedDeltaE,
      target_lab: targetShade ? { L: targetShade.target_L, a: targetShade.target_a, b: targetShade.target_b } : null,
    });
  } catch (err) {
    console.error('Error recording shade result:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record shade result' });
  }
});

// ========== TRAINING READINESS (single batch) ==========

// GET /api/dye-batches/:id/training-readiness
// Check whether this specific batch is eligible for ML training
router.get('/:id/training-readiness', async (req, res) => {
  try {
    const batchId = req.params.id;

    const { data: batch, error } = await supabase
      .from('dye_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const [targetRes, resultsRes] = await Promise.all([
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
    if (!shadeResult) {
      issues.push('missing measured Lab result');
    } else {
      if (shadeResult.measured_L === null) issues.push('measured_L is null');
      if (shadeResult.measured_a === null) issues.push('measured_a is null');
      if (shadeResult.measured_b === null) issues.push('measured_b is null');
    }
    if (!batch.fiber_composition) issues.push('missing fiber_composition');
    if (!batch.fabric_type) issues.push('missing fabric_type');
    if (!batch.dye_class) issues.push('missing dye_class');

    const training_ready = issues.length === 0;

    res.json({
      success: true,
      batch_id: batchId,
      training_ready,
      issues,
      data_quality_status: batch.data_quality_status,
      data_source: batch.data_source,
      has_measured_lab: !!shadeResult,
      delta_e_76: shadeResult ? shadeResult.delta_e_76 : null,
    });
  } catch (err) {
    console.error('Error checking training readiness:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to check readiness' });
  }
});

// ========== DATASET-LEVEL READINESS ==========

// GET /api/ml/dye-dataset/readiness
// Aggregate view: how many batches are training-ready across the whole dataset
router.get('/dataset/readiness', async (req, res) => {
  try {
    // Fetch all batches with their shade results for dataset builder
    const { data: batches, error } = await supabase
      .from('dye_batches')
      .select('id, data_quality_status, data_source, fiber_composition, fabric_type, dye_class');

    if (error) {
      if (isMissingTableError(error)) {
        return res.json({ success: true, valid: 0, invalid: 0, minimum_required: 200, gap_to_minimum: 200, collection_phase: 'collecting', provisioned: false, note: NOT_PROVISIONED_NOTE });
      }
      throw error;
    }

    // Fetch all shade results to join measured Lab
    const { data: allResults } = await supabase
      .from('dye_batch_shade_results')
      .select('batch_id, measured_L, measured_a, measured_b, data_source');

    const resultsByBatch = {};
    for (const r of allResults || []) {
      if (!resultsByBatch[r.batch_id]) resultsByBatch[r.batch_id] = [];
      resultsByBatch[r.batch_id].push(r);
    }

    // Build enriched records for the dataset builder
    const enrichedBatches = (batches || []).map(b => {
      const results = (resultsByBatch[b.id] || []).filter(r => r.data_source === 'real_batch');
      const measuredResult = results[0] || {};
      return {
        batch_id: b.id,
        data_quality_status: b.data_quality_status,
        data_source: b.data_source,
        fiber_composition: b.fiber_composition,
        fabric_type: b.fabric_type,
        dye_class: b.dye_class,
        measured_L: measuredResult.measured_L || null,
        measured_a: measuredResult.measured_a || null,
        measured_b: measuredResult.measured_b || null,
      };
    });

    const dataset = buildDyeTrainingDataset(enrichedBatches);

    res.json({
      success: true,
      ...dataset,
      minimum_required: 200,
      gap_to_minimum: Math.max(0, 200 - dataset.valid),
      collection_phase: dataset.valid >= 200 ? 'ready_for_training' : 'collecting',
    });
  } catch (err) {
    console.error('Error checking dataset readiness:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to check dataset readiness' });
  }
});

// ========== BATCH INTELLIGENCE: planned vs actual deviations ==========

// GET /api/dye-batches/:id/intelligence
// Returns recipe/process/shade deviations, missing info, warnings, explanations.
router.get('/:id/intelligence', async (req, res) => {
  try {
    const batchId = req.params.id;
    const { data: batch, error } = await supabase.from('dye_batches').select('*').eq('id', batchId).single();
    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      return res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' } });
    }
    if (!batch) return res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' } });
    const [dyesRes, chemsRes, processRes, targetRes, resultsRes] = await Promise.all([
      supabase.from('dye_batch_dyes').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_chemicals').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_process').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batchId).maybeSingle(),
      supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batchId),
    ]);
    const dyes = dyesRes.data || [];
    const chemicals = chemsRes.data || [];
    const processes = processRes.data || [];
    const planned = processes.find(p => p.process_type === 'planned') || null;
    const actual = processes.find(p => p.process_type === 'actual') || null;
    const target = targetRes.data || null;
    const measured = (resultsRes.data || [])[0] || null;

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
    if (target && measured && measured.measured_L != null) {
      const dE = measured.delta_e_76 != null ? measured.delta_e_76 : (target.target_L != null ? parseFloat(deltaE76(target.target_L, target.target_a, target.target_b, measured.measured_L, measured.measured_a, measured.measured_b).toFixed(4)) : null);
      deviations.shade = { target_lab: { L: target.target_L, a: target.target_a, b: target.target_b }, measured_lab: { L: measured.measured_L, a: measured.measured_a, b: measured.measured_b }, delta_e_76: dE };
    } else {
      if (!target) missing.push('target shade not recorded');
      if (!measured) missing.push('measured Lab* not recorded');
    }
    if (!batch.dye_class) missing.push('dye_class not recorded');
    if (deviations.process.length > 0) warnings.push(`${deviations.process.length} process/recipe deviation(s) detected between planned and actual.`);
    return res.json({ success: true, data: { batch_id: batchId, status: batch.data_quality_status, data_source: batch.data_source, deviations, missing_information: missing, warnings, explanations: ['Deviations compare planned vs actual values only; no invented tolerance thresholds are applied.', 'Shade deviation uses Delta-E 76 between target and measured Lab*.'], planned_process: planned, actual_process: actual } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'INTELLIGENCE_ERROR', message: err.message } });
  }
});

// GET /api/dye-batches/:id/comparison (expected vs actual: optimization -> batch)
router.get('/:id/comparison', async (req, res) => {
  try {
    const batchId = req.params.id;
    const { data: batch, error } = await supabase.from('dye_batches').select('*').eq('id', batchId).single();
    if (error) {
      if (isMissingTableError(error)) return res.status(500).json({ success: false, error: { code: 'DB_SCHEMA_NOT_PROVISIONED', message: NOT_PROVISIONED_NOTE } });
      return res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' } });
    }
    if (!batch) return res.status(404).json({ success: false, error: { code: 'BATCH_NOT_FOUND', message: 'Batch not found' } });
    const [dyesRes, chemsRes, processRes, targetRes, resultsRes] = await Promise.all([
      supabase.from('dye_batch_dyes').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_chemicals').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_process').select('*').eq('batch_id', batchId),
      supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batchId).maybeSingle(),
      supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batchId),
    ]);
    const measured = (resultsRes.data || [])[0] || null;
    let trainingReady = false; let readinessIssues = [];
    try {
      if (batch.data_quality_status !== 'draft' && batch.data_quality_status !== 'incomplete' && (batch.data_source === 'real_batch' || batch.data_source === 'laboratory_experiment') && measured && measured.measured_L != null && batch.fiber_composition && batch.fabric_type && batch.dye_class) trainingReady = true;
      else readinessIssues.push('Batch does not yet meet supervised training criteria.');
    } catch {}
    return res.json({ success: true, data: { batch_id: batchId, optimization_id: batch.optimization_id || null, originated_from_optimization: !!batch.optimization_id, planned_dyes: dyesRes.data || [], planned_chemicals: chemsRes.data || [], planned_process: (processRes.data || []).filter(p => p.process_type === 'planned'), actual_process: (processRes.data || []).filter(p => p.process_type === 'actual'), target_lab: targetRes.data || null, measured_lab: measured ? { L: measured.measured_L, a: measured.measured_a, b: measured.measured_b } : null, actual_delta_e_76: measured ? measured.delta_e_76 : null, training_ready: trainingReady, readiness_issues: readinessIssues, note: batch.optimization_id ? 'Batch linked to SUSTUNO optimization; recommended vs actual can be compared.' : 'Batch was not linked to an optimization session; showing planned vs actual as recorded.' } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'COMPARISON_ERROR', message: err.message } });
  }
});

module.exports = router;
