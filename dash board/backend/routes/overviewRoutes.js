// Overview System Status Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { getModelStatus } = require('../services/dyeOptimization/shadePredictionModel');

// GET /api/overview/kpis
router.get('/kpis', async (req, res) => {
  try {
    const modelStatus = getModelStatus();
    
    // Check batch count
    let batchCount = 0;
    const { data: bData } = await supabase.from('batches').select('id');
    if (bData) batchCount = bData.length;

    // Check opt sessions
    let optCount = 0;
    const { data: oData } = await supabase.from('dye_opt_sessions').select('id');
    if (oData) optCount = oData.length;

    res.json({
      success: true,
      data: {
        total_batches: batchCount,
        optimization_requests: optCount,
        supervised_training_samples: 0,
        training_ready: false,
        model_status: modelStatus.status,
        model_version: modelStatus.model_version,
        average_delta_e: null,
        note: batchCount === 0 ? 'System operational. Ready to record dyeing batches.' : 'Live status retrieved from database.'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'OVERVIEW_KPI_ERROR', message: err.message || 'Failed to fetch overview KPIs' }
    });
  }
});

module.exports = router;
