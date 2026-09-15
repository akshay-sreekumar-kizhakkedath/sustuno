// Overview System Status Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { isMissingTableError, NOT_PROVISIONED_NOTE } = require('../database/schemaGuard');
const { getModelStatus } = require('../services/dyeOptimization/shadePredictionModel');

// GET /api/overview/kpis
router.get('/kpis', async (req, res) => {
  try {
    const modelStatus = getModelStatus();

    // Batch count from the authoritative dyeing batch table (dye_batches).
    let batchCount = 0;
    let batches = [];
    const { data: bData, error: batchErr } = await supabase.from('dye_batches').select('id, data_quality_status, data_source');
    if (!batchErr && bData) {
      batchCount = bData.length;
      batches = bData;
    } else if (batchErr && isMissingTableError(batchErr)) {
      return res.json({
        success: true,
        data: {
          total_batches: 0,
          optimization_requests: 0,
          supervised_training_samples: 0,
          training_ready: false,
          model_status: modelStatus.status,
          model_version: modelStatus.model_version,
          average_delta_e: null,
          provisioned: false,
          note: NOT_PROVISIONED_NOTE,
        },
      });
    } else if (batchErr) {
      throw batchErr;
    }

    // Optimization session count (real optimization history).
    let optCount = 0;
    const { data: oData } = await supabase.from('dye_opt_sessions').select('id');
    if (oData) optCount = oData.length;

    // Real supervised training sample count: valid measured real_batch rows only.
    let supervisedSamples = 0;
    const { data: shadeResults } = await supabase
      .from('dye_batch_shade_results')
      .select('batch_id, measured_l, measured_a, measured_b, data_source, created_at');
    const batchIds = new Set(batches.map(b => b.id));
    if (shadeResults) {
      for (const r of shadeResults) {
        if (!batchIds.has(r.batch_id)) continue;
        if (r.data_source !== 'real_batch') continue;
        const measuredOk = r.measured_l !== null && r.measured_l !== undefined &&
                           r.measured_a !== null && r.measured_a !== undefined &&
                           r.measured_b !== null && r.measured_b !== undefined;
        if (measuredOk) supervisedSamples += 1;
      }
    }

    res.json({
      success: true,
      data: {
        total_batches: batchCount,
        optimization_requests: optCount,
        supervised_training_samples: supervisedSamples,
        training_ready: supervisedSamples >= 200,
        model_status: modelStatus.status,
        model_version: modelStatus.model_version,
        average_delta_e: null,
        provisioned: true,
        note: batchCount === 0
          ? 'System operational. Ready to record dyeing batches.'
          : `Live status retrieved from database (${batchCount} dye batches, ${supervisedSamples} validated supervised samples).`,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'OVERVIEW_KPI_ERROR', message: err.message || 'Failed to fetch overview KPIs' },
    });
  }
});

module.exports = router;