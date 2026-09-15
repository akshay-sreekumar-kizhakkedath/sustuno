// ML status + shade prediction endpoints (honest not_available when no model).
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { isMissingTableError, NOT_PROVISIONED_NOTE } = require('../database/schemaGuard');
const { buildDyeTrainingDataset } = require('../services/dyeOptimization/datasetBuilder');
const { getModelStatus, predictShade } = require('../services/dyeOptimization/shadePredictionModel');

// GET /api/ml/status
router.get('/status', (req, res) => {
  try {
    const s = getModelStatus();
    return res.json({ success: true, data: { model_status: s.status, available: s.available, model_version: s.model_version, dataset_version: 'none', feature_schema_version: 'v1', training_sample_count: 0, metrics: s.metrics || null, note: s.note } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'ML_STATUS_ERROR', message: err.message } });
  }
});

// POST /api/ml/predict-shade
router.post('/predict-shade', (req, res) => {
  try {
    const r = predictShade(req.body || {});
    if (r.model_status === 'not_available') return res.json({ success: true, data: { model_status: 'not_available', predicted_lab: { L: null, a: null, b: null }, predicted_delta_e: null, confidence: null, model_version: r.model_version, message: 'Shade prediction model not available — real measured dyeing data required.' } });
    return res.json({ success: true, data: { model_status: r.model_status, predicted_lab: { L: r.L, a: r.a, b: r.b }, confidence: r.confidence, model_version: r.model_version } });
  } catch (err) {
    return res.status(500).json({ success: false, error: { code: 'ML_PREDICT_ERROR', message: err.message } });
  }
});

// GET /api/ml/dye-dataset/readiness (alias used by the frontend;
// same aggregation as dyeBatchRoutes GET /dataset/readiness)
router.get('/dye-dataset/readiness', async (req, res) => {
  try {
    const { data: batches, error } = await supabase
      .from('dye_batches')
      .select('id, data_quality_status, data_source, fiber_composition, fabric_type, dye_class');
    if (error) {
      if (isMissingTableError(error)) {
        return res.json({ success: true, valid: 0, invalid: 0, minimum_required: 200, gap_to_minimum: 200, collection_phase: 'collecting', provisioned: false, note: NOT_PROVISIONED_NOTE });
      }
      throw error;
    }
    const { data: allResults } = await supabase
      .from('dye_batch_shade_results')
      .select('batch_id, measured_l, measured_a, measured_b, data_source');
    const resultsByBatch = {};
    for (const r of allResults || []) {
      if (!resultsByBatch[r.batch_id]) resultsByBatch[r.batch_id] = [];
      resultsByBatch[r.batch_id].push(r);
    }
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
        measured_l: measuredResult.measured_l || null,
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
    res.status(500).json({ success: false, error: err.message || 'Failed to check dataset readiness' });
  }
});

module.exports = router;
