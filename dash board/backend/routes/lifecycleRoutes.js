// Connected Batch Lifecycle Routes
// Production Order → Optimization → Batch → Production → Shade → Wastewater → ETP → Report

const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const batchLifecycle = require('../services/batchLifecycleService');
const { getBatchDossier } = require('../services/workflowService');

// POST /api/lifecycle/production-order
// Create a new production order
router.post('/production-order', async (req, res) => {
  try {
    const result = await batchLifecycle.createProductionOrder(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating production order:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create production order' });
  }
});

// GET /api/lifecycle/production-orders
// List all production orders
router.get('/production-orders', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('production_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data: orders || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch production orders' });
  }
});

// POST /api/lifecycle/production-order/:orderId/optimize
// Create optimization from a production order
router.post('/production-order/:orderId/optimize', async (req, res) => {
  try {
    const result = await batchLifecycle.createOptimizationFromOrder(req.params.orderId, req.body?.preferences || {});
    res.json(result);
  } catch (err) {
    console.error('Error creating optimization from order:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create optimization' });
  }
});

// POST /api/lifecycle/batch/:batchId/use-recipe
// Use recommended recipe to create/confirm batch
router.post('/batch/:batchId/use-recipe', async (req, res) => {
  try {
    const result = await batchLifecycle.useRecommendedRecipe(req.params.batchId, req.body?.recipe);
    res.json(result);
  } catch (err) {
    console.error('Error using recommended recipe:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to use recommended recipe' });
  }
});

// POST /api/lifecycle/batch/:batchId/actual-recipe
// Record actual production recipe values
router.post('/batch/:batchId/actual-recipe', async (req, res) => {
  try {
    const { actual_dyes, actual_chemicals, actual_process } = req.body || {};
    const result = await batchLifecycle.recordActualRecipe(req.params.batchId, actual_dyes, actual_chemicals, actual_process);
    res.json(result);
  } catch (err) {
    console.error('Error recording actual recipe:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record actual recipe' });
  }
});

// POST /api/lifecycle/batch/:batchId/shade
// Record measured shade result (auto-calculates ΔE)
router.post('/batch/:batchId/shade', async (req, res) => {
  try {
    const { measured_L, measured_a, measured_b, metadata } = req.body || {};
    if (measured_L === undefined || measured_a === undefined || measured_b === undefined) {
      return res.status(400).json({ success: false, error: 'measured_L, measured_a, measured_b are required' });
    }
    const result = await batchLifecycle.recordShadeResult(req.params.batchId, measured_L, measured_a, measured_b, metadata || {});
    res.json(result);
  } catch (err) {
    console.error('Error recording shade result:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record shade result' });
  }
});

// GET /api/lifecycle/batch/:batchId/intelligence
// Calculate batch intelligence (deviations, anomalies)
router.get('/batch/:batchId/intelligence', async (req, res) => {
  try {
    const result = await batchLifecycle.calculateBatchIntelligence(req.params.batchId);
    res.json(result);
  } catch (err) {
    console.error('Error calculating batch intelligence:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to calculate intelligence' });
  }
});

// POST /api/lifecycle/batch/:batchId/wastewater-predict
// Create wastewater prediction from batch context
router.post('/batch/:batchId/wastewater-predict', async (req, res) => {
  try {
    const result = await batchLifecycle.createWastewaterPrediction(req.params.batchId);
    res.json(result);
  } catch (err) {
    console.error('Error creating wastewater prediction:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create prediction' });
  }
});

// POST /api/lifecycle/batch/:batchId/wastewater-measurement
// Record actual wastewater measurements
router.post('/batch/:batchId/wastewater-measurement', async (req, res) => {
  try {
    const { measurements, metadata } = req.body || {};
    if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
      return res.status(400).json({ success: false, error: 'measurements array is required' });
    }
    const result = await batchLifecycle.recordWastewaterMeasurement(req.params.batchId, measurements, metadata || {});
    res.json(result);
  } catch (err) {
    console.error('Error recording wastewater measurement:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record measurement' });
  }
});

// GET /api/lifecycle/batch/:batchId/comparison
// Compare expected vs actual wastewater
router.get('/batch/:batchId/comparison', async (req, res) => {
  try {
    const result = await batchLifecycle.compareExpectedVsActual(req.params.batchId);
    res.json(result);
  } catch (err) {
    console.error('Error comparing expected vs actual:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to compare' });
  }
});

// GET /api/lifecycle/batch/:batchId/etp
// Generate ETP recommendation for batch
router.get('/batch/:batchId/etp', async (req, res) => {
  try {
    const result = await batchLifecycle.generateETPRecommendation(req.params.batchId);
    res.json(result);
  } catch (err) {
    console.error('Error generating ETP recommendation:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate ETP recommendation' });
  }
});

// GET /api/lifecycle/batch/:batchId/training-readiness
// Evaluate training readiness
router.get('/batch/:batchId/training-readiness', async (req, res) => {
  try {
    const result = await batchLifecycle.evaluateTrainingReadiness(req.params.batchId);
    res.json(result);
  } catch (err) {
    console.error('Error evaluating training readiness:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to evaluate readiness' });
  }
});

// GET /api/lifecycle/batch/:batchId/report
// Generate complete batch report
router.get('/batch/:batchId/report', async (req, res) => {
  try {
    const report = await batchLifecycle.generateBatchReport(req.params.batchId);
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Error generating batch report:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate report' });
  }
});

// GET /api/lifecycle/batch/:batchId/workspace
// Get full batch workspace data
router.get('/batch/:batchId/workspace', async (req, res) => {
  try {
    const dossier = await getBatchDossier(req.params.batchId);
    if (!dossier) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const intelligence = await batchLifecycle.calculateBatchIntelligence(req.params.batchId);
    const trainingReadiness = await batchLifecycle.evaluateTrainingReadiness(req.params.batchId);

    res.json({
      success: true,
      data: {
        batch: dossier,
        intelligence,
        training_readiness: trainingReadiness,
        workspace_sections: {
          overview: true,
          recipe: true,
          process: true,
          shade: true,
          wastewater: true,
          etp: true,
          analytics: true,
          report: true,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching batch workspace:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch workspace' });
  }
});

// POST /api/lifecycle/batch/:batchId/state-transition
// Record a state transition in the timeline
router.post('/batch/:batchId/state-transition', async (req, res) => {
  try {
    const { to_status, trigger, notes } = req.body || {};
    if (!to_status) {
      return res.status(400).json({ success: false, error: 'to_status is required' });
    }

    const { data: batch } = await supabase.from('dye_batches').select('lifecycle_status').eq('id', req.params.batchId).maybeSingle();
    const from_status = batch?.lifecycle_status || 'DRAFT';

    await supabase.from('batch_state_timeline').insert([{
      batch_id: req.params.batchId,
      from_status,
      to_status,
      trigger: trigger || 'manual',
      notes: notes || '',
    }]);

    await supabase.from('dye_batches').update({ lifecycle_status: to_status }).eq('id', req.params.batchId);

    res.json({ success: true, batch_id: req.params.batchId, from_status, to_status });
  } catch (err) {
    console.error('Error recording state transition:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to record state transition' });
  }
});

module.exports = router;
