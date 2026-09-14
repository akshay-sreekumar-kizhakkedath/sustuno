// Wastewater Profile API Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const { predictWastewaterProfile } = require('../services/wastewater/wastewaterPredictor');

// POST /api/wastewater/predict
router.post('/predict', (req, res) => {
  try {
    const input = req.body || {};
    const prediction = predictWastewaterProfile(input);
    res.json({
      success: true,
      data: prediction
    });
  } catch (err) {
    console.error('Error predicting wastewater profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'WASTEWATER_PREDICTION_ERROR',
        message: err.message || 'Failed to predict wastewater profile'
      }
    });
  }
});

// GET /api/wastewater/batches/:id
router.get('/batches/:id', async (req, res) => {
  try {
    const batchId = req.params.id;
    const { data: batch } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .maybeSingle();

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: `Batch ${batchId} not found.`
        }
      });
    }

    const prediction = predictWastewaterProfile(batch);

    res.json({
      success: true,
      data: {
        batch_id: batchId,
        prediction,
        measured_profile: null,
        note: 'No physical measured wastewater sensors attached for this batch.'
      }
    });
  } catch (err) {
    console.error('Error fetching batch wastewater profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'WASTEWATER_FETCH_ERROR',
        message: err.message || 'Failed to fetch wastewater profile'
      }
    });
  }
});

module.exports = router;
