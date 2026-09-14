// Report Generation & Listing Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { getModelStatus } = require('../services/dyeOptimization/shadePredictionModel');

// POST /api/reports/generate
router.post('/generate', async (req, res) => {
  try {
    const { report_type, batch_id, optimization_id } = req.body || {};
    
    if (!report_type) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REPORT_TYPE', message: 'report_type is required' }
      });
    }

    const modelStatus = getModelStatus();
    const timestamp = new Date().toISOString();

    const reportData = {
      report_id: `REP-${Date.now()}`,
      report_type,
      generated_at: timestamp,
      target_id: batch_id || optimization_id || 'N/A',
      metadata: {
        model_status: modelStatus.status,
        model_version: modelStatus.model_version,
        kb_rules_evaluated: 13,
        kb_rule_status: 'pending_human_validation'
      },
      content: {
        title: `SUSTUNO ${report_type.replace(/_/g, ' ').toUpperCase()} REPORT`,
        summary: `Generated auditable report for ${report_type}.`,
        warnings: [
          'All KB domain rules operate with human_validation_status=pending.',
          'Shade predictions reflect fallback heuristic mode when ML model status is not_available.'
        ]
      }
    };

    res.status(201).json({
      success: true,
      data: reportData
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'REPORT_GEN_ERROR', message: err.message || 'Failed to generate report' }
    });
  }
});

// GET /api/reports/list
router.get('/list', async (req, res) => {
  try {
    const { data: reports } = await supabase.from('recent_reports').select('*').limit(20);
    res.json({
      success: true,
      data: {
        total: (reports || []).length,
        reports: reports || [],
        note: (reports || []).length === 0 ? 'No historical reports stored in database.' : 'Reports retrieved.'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'REPORTS_LIST_ERROR', message: err.message || 'Failed to list reports' }
    });
  }
});

module.exports = router;
