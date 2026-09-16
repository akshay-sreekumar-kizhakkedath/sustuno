// Central Workflow Orchestrator for SUSTUNO
// Connects Production -> Optimization -> Recipe Confirmation ->
// Wastewater Prediction -> IoT Monitoring -> Expected vs Actual -> ETP Decision -> Completion

const { supabase } = require('../database/supabaseClient');
const { runOptimizationPipeline } = require('./dyeOptimization/optimizer');
const { predictWastewaterProfile } = require('./wastewater/wastewaterPredictor');
const { evaluateEtpDecision } = require('./etp/etpDecisionEngine');
const { isMissingTableError } = require('../database/schemaGuard');

// In-memory runtime cache for seamless fallback if migration tables are pending
const runtimeCache = {
  activeBatchId: null,
  activeDeviceId: 'SUSTUNO-ESP32-001',
  predictions: new Map(),
  comparisons: new Map(),
  recommendations: new Map(),
  sessions: new Map(),
};

// Helper to resolve batch by UUID id or string batch_id
async function resolveBatch(idOrBatchId) {
  if (!idOrBatchId) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idOrBatchId));
  let query = supabase.from('dye_batches').select('*');
  if (isUuid) {
    query = query.or(`id.eq.${idOrBatchId},batch_id.eq.${idOrBatchId}`);
  } else {
    query = query.eq('batch_id', idOrBatchId);
  }
  const { data, error } = await query.maybeSingle();
  if (error && !isMissingTableError(error)) {
    console.error('[Workflow] resolveBatch error:', error.message);
  }
  return data || null;
}

// Generate human-readable batch_id (e.g. BATCH-2026-0001)
async function generateBatchId() {
  const year = new Date().getFullYear();
  const { count } = await supabase.from('dye_batches').select('*', { count: 'exact', head: true });
  const seq = String((count || 0) + 1).padStart(4, '0');
  return `BATCH-${year}-${seq}`;
}

// 1. Create a new production batch
async function createBatch(input) {
  const batchId = input.batch_id || await generateBatchId();

  const batchRow = {
    batch_id: batchId,
    fabric_type: input.fabric_type || 'Cotton Single Jersey Knit',
    fiber_composition: typeof input.fiber_composition === 'string'
      ? input.fiber_composition
      : JSON.stringify(input.fiber_composition || ['Cotton']),
    fabric_weight_kg: Number(input.fabric_weight_kg) || 200,
    gsm: Number(input.gsm) || 180,
    dye_class: input.dye_class || 'Reactive',
    machine: input.machine || 'TECWIN-HTHP-300',
    status: 'draft',
    data_quality_status: 'draft',
    data_source: 'real_batch',
    notes: JSON.stringify({
      order_number: input.order_number || `ORD-${Date.now().toString().slice(-6)}`,
      customer: input.customer || 'Internal Production',
      operator: input.operator || 'System Operator',
      lifecycle_status: 'OPTIMIZATION_PENDING',
      original_input: input,
      created_at: new Date().toISOString(),
    }),
  };

  const { data, error } = await supabase
    .from('dye_batches')
    .insert([batchRow])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create batch: ${error.message}`);
  }

  // Insert target shade if supplied
  if (input.target_shade && (input.target_shade.L !== undefined || input.target_shade.target_l !== undefined)) {
    const L = Number(input.target_shade.L ?? input.target_shade.target_l ?? 45);
    const a = Number(input.target_shade.a ?? input.target_shade.target_a ?? 10);
    const b = Number(input.target_shade.b ?? input.target_shade.target_b ?? -20);
    await supabase.from('dye_batch_target_shade').insert([{
      batch_id: data.id,
      target_l: L,
      target_a: a,
      target_b: b,
      shade_name: input.target_shade.shade_name || 'Navy Blue',
      shade_code: input.target_shade.shade_code || 'NAVY-01',
      shade_depth: input.target_shade.shade_depth || 'Medium',
    }]);
  }

  // Insert planned process parameters
  const proc = input.process_parameters || {};
  await supabase.from('dye_batch_process').insert([{
    batch_id: data.id,
    process_type: 'planned',
    machine: input.machine || 'TECWIN-HTHP-300',
    liquor_ratio: Number(proc.liquor_ratio || 10),
    temperature: Number(proc.temperature || 60),
    temperature_actual: null,
    time_minutes: Number(proc.time_minutes || 60),
    ph: Number(proc.ph || 11),
    ph_actual: null,
  }]);

  return await getBatchDossier(data.id);
}

// 2. Retrieve complete batch dossier
async function getBatchDossier(idOrBatchId) {
  const batch = await resolveBatch(idOrBatchId);
  if (!batch) return null;

  const batchId = batch.id;
  const humanId = batch.batch_id || batch.id;

  // Unpack metadata from notes
  let meta = {};
  try {
    if (batch.notes && batch.notes.startsWith('{')) {
      meta = JSON.parse(batch.notes);
    }
  } catch {}

  // Fetch child tables in parallel
  const [targetRes, processRes, dyesRes, chemsRes, shadeRes, optRes] = await Promise.all([
    supabase.from('dye_batch_target_shade').select('*').eq('batch_id', batchId).maybeSingle(),
    supabase.from('dye_batch_process').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_dyes').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_chemicals').select('*').eq('batch_id', batchId),
    supabase.from('dye_batch_shade_results').select('*').eq('batch_id', batchId).maybeSingle(),
    batch.optimization_id
      ? supabase.from('dye_opt_sessions').select('*').eq('id', batch.optimization_id).maybeSingle()
      : { data: null },
  ]);

  // Fetch or retrieve wastewater prediction
  let prediction = runtimeCache.predictions.get(humanId) || runtimeCache.predictions.get(batchId) || meta.prediction || null;
  if (!prediction) {
    const { data: pData } = await supabase.from('wastewater_predictions').select('*').eq('batch_id', batchId).maybeSingle();
    if (pData) prediction = pData;
  }

  // Fetch latest telemetry for this batch
  const { data: telemetry } = await supabase
    .from('sensor_telemetry')
    .select('*')
    .or(`batch_id.eq.${humanId},batch_id.eq.${batchId}`)
    .order('timestamp', { ascending: false })
    .limit(50);

  // Compute comparison
  const comparison = calculateExpectedVsActual(prediction, telemetry || []);

  // Fetch or retrieve ETP recommendation
  let etpRecommendation = runtimeCache.recommendations.get(humanId) || runtimeCache.recommendations.get(batchId) || meta.etp_recommendation || null;
  if (!etpRecommendation) {
    const { data: eData } = await supabase.from('etp_recommendations').select('*').eq('batch_id', batchId).maybeSingle();
    if (eData) etpRecommendation = eData;
  }

  const lifecycle_status = meta.lifecycle_status || batch.status?.toUpperCase() || 'DRAFT';

  return {
    id: batch.id,
    batch_id: humanId,
    order_number: meta.order_number || 'ORD-DEFAULT',
    customer: meta.customer || 'Standard Production',
    operator: meta.operator || 'Plant Operator',
    fabric_type: batch.fabric_type,
    fiber_composition: batch.fiber_composition,
    fabric_weight_kg: batch.fabric_weight_kg,
    gsm: batch.gsm,
    dye_class: batch.dye_class,
    machine: batch.machine,
    status: batch.status,
    lifecycle_status,
    data_quality_status: batch.data_quality_status,
    data_source: batch.data_source,
    created_at: batch.created_at,
    target_shade: targetRes.data || null,
    process: processRes.data || [],
    dyes: dyesRes.data || [],
    chemicals: chemsRes.data || [],
    shade_result: shadeRes.data || null,
    optimization_id: batch.optimization_id,
    optimization_session: optRes.data || null,
    original_input: meta.original_input || null,
    confirmed_recipe: meta.confirmed_recipe || null,
    confirmed_at: meta.confirmed_at || null,
    prediction,
    telemetry: telemetry || [],
    comparison,
    etp_recommendation: etpRecommendation,
  };
}

// 3. Run optimization for a batch
async function optimizeBatch(idOrBatchId, preferences = {}) {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) throw new Error(`Batch not found: ${idOrBatchId}`);

  // Formulate standard optimizer payload
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

  const optResult = await runOptimizationPipeline(optPayload);

  // Link optimization session to batch in dye_batches
  const sessionId = optResult?.optimization?.session_id;
  await updateBatchMeta(dossier.id, {
    lifecycle_status: 'OPTIMIZATION_READY',
    last_optimization_result: optResult,
  });

  if (sessionId) {
    await supabase
      .from('dye_batches')
      .update({ optimization_id: sessionId })
      .eq('id', dossier.id);
  }

  return {
    batch_id: dossier.batch_id,
    lifecycle_status: 'OPTIMIZATION_READY',
    optimization: optResult,
  };
}

// 4. Confirm recipe and automatically trigger wastewater prediction
async function confirmRecipe(idOrBatchId, recipeData, operator = 'Operator') {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) throw new Error(`Batch not found: ${idOrBatchId}`);

  const confirmedRecipe = recipeData || dossier.original_input?.recommended_recipe || {};

  // Store confirmed dyes in dye_batch_dyes
  if (Array.isArray(confirmedRecipe.dyes) && confirmedRecipe.dyes.length > 0) {
    await supabase.from('dye_batch_dyes').delete().eq('batch_id', dossier.id);
    const dyeRows = confirmedRecipe.dyes.map(d => ({
      batch_id: dossier.id,
      dye_id: d.dye_id || d.id || null,
      dye_name: d.name || d.dye_name || null,
      planned_concentration: Number(d.pct_owf ?? d.planned_concentration ?? 0),
      planned_quantity_kg: Number(d.quantity_kg ?? d.planned_quantity_kg ?? 0),
    }));
    await supabase.from('dye_batch_dyes').insert(dyeRows);
  }

  // Store confirmed chemicals in dye_batch_chemicals
  if (Array.isArray(confirmedRecipe.chemicals) && confirmedRecipe.chemicals.length > 0) {
    await supabase.from('dye_batch_chemicals').delete().eq('batch_id', dossier.id);
    const chemRows = confirmedRecipe.chemicals.map(c => ({
      batch_id: dossier.id,
      chemical_id: c.chemical_id || c.id || null,
      chemical_name: c.name || c.chemical_name || null,
      planned_dosage: Number(c.dosage ?? c.planned_dosage ?? 0),
      unit: c.unit || 'g/L',
    }));
    await supabase.from('dye_batch_chemicals').insert(chemRows);
  }

  // Update process parameters
  const proc = confirmedRecipe.process_parameters || {};
  if (proc.temperature || proc.liquor_ratio) {
    await supabase
      .from('dye_batch_process')
      .update({
        liquor_ratio: Number(proc.liquor_ratio || 10),
        temperature: Number(proc.temperature || 60),
        time_minutes: Number(proc.time_minutes || 60),
        ph: Number(proc.ph || 11),
      })
      .eq('batch_id', dossier.id)
      .eq('process_type', 'planned');
  }

  // Automatically generate wastewater prediction from confirmed parameters
  const prediction = predictWastewaterProfile({
    recipe: {
      dye_class: dossier.dye_class,
      dyes: confirmedRecipe.dyes || [],
      chemicals: confirmedRecipe.chemicals || [],
    },
    process: confirmedRecipe.process_parameters || {},
    batch: {
      fabric_weight_kg: dossier.fabric_weight_kg,
      gsm: dossier.gsm,
      machine_id: dossier.machine,
    },
  });

  // Persist prediction in memory and DB
  runtimeCache.predictions.set(dossier.batch_id, prediction);
  runtimeCache.predictions.set(dossier.id, prediction);

  // Try writing to wastewater_predictions table (graceful fallback)
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
    // Non-fatal if table not yet migrated
  }

  // Transition status to RECIPE_CONFIRMED
  await updateBatchMeta(dossier.id, {
    lifecycle_status: 'RECIPE_CONFIRMED',
    confirmed_recipe: confirmedRecipe,
    confirmed_at: new Date().toISOString(),
    confirmed_by: operator,
    prediction,
  });

  await supabase
    .from('dye_batches')
    .update({ status: 'confirmed' })
    .eq('id', dossier.id);

  return {
    success: true,
    batch_id: dossier.batch_id,
    lifecycle_status: 'RECIPE_CONFIRMED',
    confirmed_recipe: confirmedRecipe,
    prediction,
  };
}

// 5. Start Production and activate IoT monitoring session
async function startProduction(idOrBatchId, deviceId = 'SUSTUNO-ESP32-001') {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) throw new Error(`Batch not found: ${idOrBatchId}`);

  runtimeCache.activeBatchId = dossier.batch_id;
  runtimeCache.activeDeviceId = deviceId;

  const sessionRecord = {
    batch_id: dossier.batch_id,
    batch_uuid: dossier.id,
    device_id: deviceId,
    status: 'active',
    started_at: new Date().toISOString(),
  };

  runtimeCache.sessions.set(dossier.batch_id, sessionRecord);

  try {
    await supabase.from('iot_monitoring_sessions').insert([{
      batch_id: dossier.id,
      device_id: deviceId,
      status: 'active',
    }]);
  } catch (err) {}

  await updateBatchMeta(dossier.id, {
    lifecycle_status: 'PRODUCTION_ACTIVE',
    active_device_id: deviceId,
    production_started_at: new Date().toISOString(),
  });

  await supabase
    .from('dye_batches')
    .update({ status: 'active' })
    .eq('id', dossier.id);

  return {
    success: true,
    batch_id: dossier.batch_id,
    lifecycle_status: 'PRODUCTION_ACTIVE',
    active_device: deviceId,
    session: sessionRecord,
  };
}

// 6. Expected vs Actual Comparison Logic
function calculateExpectedVsActual(prediction, telemetry) {
  if (!telemetry || telemetry.length === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      note: 'No sensor telemetry recorded yet for this batch.',
      comparisons: [],
    };
  }

  // Get latest reading per sensor_id
  const latestBySensor = {};
  for (const row of telemetry) {
    if (!latestBySensor[row.sensor_id]) {
      latestBySensor[row.sensor_id] = row;
    }
  }

  const est = prediction?.engineering_estimates || {};
  const pred = prediction?.predicted_profile || {};

  const metrics = [
    {
      metric: 'pH',
      unit: 'pH units',
      expected: est.expected_bath_pH ?? pred.pH ?? 7.0,
      expected_kind: est.expected_bath_pH ? 'ESTIMATED (from recipe)' : 'ESTIMATED',
      actual: latestBySensor['ph'] ? Number(latestBySensor['ph'].value) : null,
      actual_kind: 'MEASURED (Analog Probe)',
      sensor_status: latestBySensor['ph']?.status || 'UNCALIBRATED',
      tolerance: 1.0, // allowed deviation
    },
    {
      metric: 'Temperature',
      unit: '°C',
      expected: 60.0, // standard reactive process temp
      expected_kind: 'ESTIMATED (process recipe)',
      actual: latestBySensor['temperature'] ? Number(latestBySensor['temperature'].value) : null,
      actual_kind: 'MEASURED (DS18B20)',
      sensor_status: latestBySensor['temperature']?.status || 'OK',
      tolerance: 5.0,
    },
    {
      metric: 'TDS',
      unit: 'ppm',
      expected: pred.TDS ?? null,
      expected_kind: pred.TDS ? 'PREDICTED' : 'UNAVAILABLE',
      actual: latestBySensor['tds'] ? Number(latestBySensor['tds'].value) : null,
      actual_kind: 'MEASURED (TDS Sensor)',
      sensor_status: latestBySensor['tds']?.status || 'OK',
      tolerance: 200,
    },
    {
      metric: 'Turbidity',
      unit: 'NTU',
      expected: pred.turbidity ?? null,
      expected_kind: pred.turbidity ? 'PREDICTED' : 'UNAVAILABLE',
      actual: latestBySensor['turbidity'] ? Number(latestBySensor['turbidity'].value) : null,
      actual_kind: 'MEASURED (Turbidity Sensor)',
      sensor_status: latestBySensor['turbidity']?.status || 'UNCALIBRATED',
      tolerance: 20,
    },
    {
      metric: 'Flow Rate',
      unit: 'L/min',
      expected: null,
      expected_kind: 'UNAVAILABLE',
      actual: latestBySensor['flow_rate'] ? Number(latestBySensor['flow_rate'].value) : null,
      actual_kind: 'MEASURED (ZJ-S201)',
      sensor_status: latestBySensor['flow_rate']?.status || 'OK',
      tolerance: null,
    },
  ];

  let overallStatus = 'NORMAL';
  const comparisons = [];

  for (const m of metrics) {
    if (m.actual === null || m.expected === null) {
      comparisons.push({
        ...m,
        deviation: null,
        deviation_pct: null,
        status: m.actual === null ? 'NO_ACTUAL' : 'NO_EXPECTED',
      });
      continue;
    }

    const diff = m.actual - m.expected;
    const pct = m.expected !== 0 ? ((diff / m.expected) * 100) : 0;
    let status = 'NORMAL';

    if (Math.abs(pct) > 30) {
      status = 'HIGH_DEVIATION';
      overallStatus = 'HIGH_DEVIATION';
    } else if (Math.abs(pct) > 15) {
      status = 'MINOR_DEVIATION';
      if (overallStatus !== 'HIGH_DEVIATION') overallStatus = 'MINOR_DEVIATION';
    }

    comparisons.push({
      ...m,
      deviation: parseFloat(diff.toFixed(2)),
      deviation_pct: parseFloat(pct.toFixed(1)),
      status,
    });
  }

  return {
    status: overallStatus,
    evaluated_at: new Date().toISOString(),
    total_telemetry_records: telemetry.length,
    comparisons,
  };
}

// 7. Get ETP recommendation for a batch (retrieves existing, does not change status)
async function getBatchEtpRecommendation(idOrBatchId) {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) return null;

  // Check runtime cache first
  const humanId = dossier.batch_id || dossier.id;
  const cached = runtimeCache.recommendations.get(humanId);
  if (cached) return cached;

  // Check database
  const { data: eData } = await supabase.from('etp_recommendations').select('*').eq('batch_id', humanId).maybeSingle();
  if (eData) {
    runtimeCache.recommendations.set(humanId, eData);
    return eData;
  }

  // Generate on demand if batch is in a state that has data
  if (dossier.lifecycle_status === 'PRODUCTION_ACTIVE' || dossier.lifecycle_status === 'RECIPE_CONFIRMED' || dossier.lifecycle_status === 'ETP_REVIEW') {
    return generateBatchEtpDecision(idOrBatchId);
  }

  return null;
}

// 7. Generate automatic ETP Decision Support
async function generateBatchEtpDecision(idOrBatchId) {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) throw new Error(`Batch not found: ${idOrBatchId}`);

  // Ingest batch data into ETP engine
  const etpInput = {
    recipe: {
      dye_class: dossier.dye_class,
      liquor_ratio: dossier.confirmed_recipe?.process_parameters?.liquor_ratio || '1:10',
      fabric_weight_kg: dossier.fabric_weight_kg,
    },
    wastewater_profile: {
      pH: dossier.comparison?.comparisons?.find(c => c.metric === 'pH')?.actual ?? null,
      TDS: dossier.comparison?.comparisons?.find(c => c.metric === 'TDS')?.actual ?? null,
      temperature: dossier.comparison?.comparisons?.find(c => c.metric === 'Temperature')?.actual ?? null,
      turbidity: dossier.comparison?.comparisons?.find(c => c.metric === 'Turbidity')?.actual ?? null,
      COD: dossier.prediction?.predicted_profile?.COD ?? null,
    },
    plant_config: {
      jar_test_data: 'Standard Industrial Calibration Reference',
    },
  };

  const decision = evaluateEtpDecision(etpInput);

  // Augment with batch-specific context
  const recommendation = {
    batch_id: dossier.batch_id,
    ...decision,
    lineage: {
      batch_id: dossier.batch_id,
      fabric: dossier.fabric_type,
      dye_class: dossier.dye_class,
      actual_ph: etpInput.wastewater_profile.pH,
      expected_ph: dossier.comparison?.comparisons?.find(c => c.metric === 'pH')?.expected,
      comparison_status: dossier.comparison?.status || 'NORMAL',
    },
    generated_at: new Date().toISOString(),
  };

  runtimeCache.recommendations.set(dossier.batch_id, recommendation);
  runtimeCache.recommendations.set(dossier.id, recommendation);

  await updateBatchMeta(dossier.id, {
    lifecycle_status: 'ETP_REVIEW',
    etp_recommendation: recommendation,
  });

  return recommendation;
}

// 8. Complete batch and archive for training
async function completeBatch(idOrBatchId, completionData = {}) {
  const dossier = await getBatchDossier(idOrBatchId);
  if (!dossier) throw new Error(`Batch not found: ${idOrBatchId}`);

  // If measured spectrophotometer shade was provided, store it
  if (completionData.measured_shade) {
    const s = completionData.measured_shade;
    await supabase.from('dye_batch_shade_results').insert([{
      batch_id: dossier.id,
      measured_l: s.L,
      measured_a: s.a,
      measured_b: s.b,
      measurement_instrument: s.instrument || 'Spectrophotometer Datacolor 800',
      data_source: 'real_batch',
    }]);
  }

  await updateBatchMeta(dossier.id, {
    lifecycle_status: 'BATCH_COMPLETED',
    completion_notes: completionData.notes || 'Batch completed successfully through unified workflow.',
    completed_at: new Date().toISOString(),
  });

  await supabase
    .from('dye_batches')
    .update({
      status: 'completed',
      data_quality_status: 'complete',
    })
    .eq('id', dossier.id);

  if (runtimeCache.activeBatchId === dossier.batch_id) {
    runtimeCache.activeBatchId = null;
  }

  return {
    success: true,
    batch_id: dossier.batch_id,
    lifecycle_status: 'BATCH_COMPLETED',
    completed_at: new Date().toISOString(),
  };
}

// Helper to update JSON metadata inside dye_batches.notes
async function updateBatchMeta(batchUuid, metaUpdates) {
  const { data } = await supabase.from('dye_batches').select('notes').eq('id', batchUuid).maybeSingle();
  let current = {};
  try {
    if (data?.notes && data.notes.startsWith('{')) current = JSON.parse(data.notes);
  } catch {}

  const merged = { ...current, ...metaUpdates, updated_at: new Date().toISOString() };
  await supabase
    .from('dye_batches')
    .update({ notes: JSON.stringify(merged) })
    .eq('id', batchUuid);
}

module.exports = {
  runtimeCache,
  resolveBatch,
  generateBatchId,
  createBatch,
  getBatchDossier,
  optimizeBatch,
  confirmRecipe,
  startProduction,
  calculateExpectedVsActual,
  getBatchEtpRecommendation,
  generateBatchEtpDecision,
  completeBatch,
};
