// Process Analytics & Recipe Performance Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const { data: optSessions } = await supabase.from('dye_opt_sessions').select('id, created_at, status');
    
    res.json({
      success: true,
      data: {
        total_optimizations: (optSessions || []).length,
        successful_optimizations: (optSessions || []).filter(s => s.status === 'completed').length,
        supervised_samples_count: 0,
        target_sample_threshold: 200,
        dataset_growth_rate: 0,
        model_performance: {
          status: 'not_available',
          note: 'Model performance metrics available after first supervised training run.'
        },
        empty_state_note: (optSessions || []).length === 0 ? 'No historical optimization analytics available yet.' : null
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_ERROR', message: err.message || 'Failed to fetch analytics' }
    });
  }
});

module.exports = router;
