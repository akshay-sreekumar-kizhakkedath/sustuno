// Production Monitoring Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');

// GET /api/production/batches
router.get('/batches', async (req, res) => {
  try {
    // Attempt query from dye_batches or batches
    let batches = [];
    const { data: b1, error: err1 } = await supabase.from('dye_batches').select('*').limit(50);
    if (!err1 && b1) {
      batches = b1;
    } else {
      const { data: b2 } = await supabase.from('batches').select('*').limit(50);
      batches = b2 || [];
    }

    res.json({
      success: true,
      data: {
        total_batches: batches.length,
        batches: batches.map(b => ({
          id: b.id,
          batch_id: b.batch_id || b.id,
          fiber_composition: b.fiber_composition,
          fabric_type: b.fabric_type,
          dye_class: b.dye_class,
          status: b.status || b.data_quality_status || 'draft',
          created_at: b.created_at
        })),
        note: batches.length === 0 ? 'No production batches currently recorded in database.' : 'Production batches retrieved from database.'
      }
    });
  } catch (err) {
    console.error('Error fetching production batches:', err);
    res.status(500).json({
      success: false,
      error: { code: 'PRODUCTION_FETCH_ERROR', message: err.message || 'Failed to fetch production batches' }
    });
  }
});

// GET /api/production/summary
router.get('/summary', async (req, res) => {
  try {
    const { data: batches } = await supabase.from('batches').select('status');
    const total = (batches || []).length;
    res.json({
      success: true,
      data: {
        total_batches: total,
        active_batches: (batches || []).filter(b => b.status === 'active').length,
        completed_batches: (batches || []).filter(b => b.status === 'completed').length,
        training_ready_batches: 0,
        note: total === 0 ? 'No production data available.' : 'Live summary from database.'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SUMMARY_ERROR', message: err.message || 'Failed to fetch summary' }
    });
  }
});

module.exports = router;
