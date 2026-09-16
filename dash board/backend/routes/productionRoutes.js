// Production Workflow & Batch Management Routes
const express = require('express');
const router = express.Router();
const { supabase } = require('../database/supabaseClient');
const {
  createBatch,
  getBatchDossier,
  startProduction,
  completeBatch,
} = require('../services/workflowService');

// POST /api/production/batches
// Create a new production batch (DRAFT -> OPTIMIZATION_PENDING)
router.post('/batches', async (req, res) => {
  try {
    const batch = await createBatch(req.body || {});
    res.status(201).json({
      success: true,
      data: batch,
      message: `Production batch ${batch.batch_id} created successfully.`,
    });
  } catch (err) {
    console.error('Error creating production batch:', err);
    res.status(400).json({
      success: false,
      error: { code: 'BATCH_CREATE_ERROR', message: err.message || 'Failed to create batch' },
    });
  }
});

// GET /api/production/batches
// List all production batches with unified lifecycle status
router.get('/batches', async (req, res) => {
  try {
    const { data: batches, error } = await supabase
      .from('dye_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const list = (batches || []).map(b => {
      let meta = {};
      try {
        if (b.notes && b.notes.startsWith('{')) meta = JSON.parse(b.notes);
      } catch {}

      return {
        id: b.id,
        batch_id: b.batch_id || b.id,
        order_number: meta.order_number || 'ORD-DEFAULT',
        customer: meta.customer || 'Standard Production',
        fiber_composition: b.fiber_composition,
        fabric_type: b.fabric_type,
        fabric_weight_kg: b.fabric_weight_kg,
        gsm: b.gsm,
        dye_class: b.dye_class,
        machine: b.machine,
        status: b.status || 'draft',
        lifecycle_status: meta.lifecycle_status || (b.status ? b.status.toUpperCase() : 'DRAFT'),
        data_quality_status: b.data_quality_status || 'draft',
        has_confirmed_recipe: !!meta.confirmed_recipe,
        has_prediction: !!meta.prediction,
        created_at: b.created_at,
      };
    });

    res.json({
      success: true,
      data: {
        total_batches: list.length,
        batches: list,
        note: list.length === 0 ? 'No production batches currently recorded in database.' : 'Production batches retrieved from database.',
      },
    });
  } catch (err) {
    console.error('Error fetching production batches:', err);
    res.status(500).json({
      success: false,
      error: { code: 'PRODUCTION_FETCH_ERROR', message: err.message || 'Failed to fetch production batches' },
    });
  }
});

// GET /api/production/batches/:id
// Retrieve complete batch dossier across all workflow stages
router.get('/batches/:id', async (req, res) => {
  try {
    const dossier = await getBatchDossier(req.params.id);
    if (!dossier) {
      return res.status(404).json({
        success: false,
        error: { code: 'BATCH_NOT_FOUND', message: `Batch ${req.params.id} not found.` },
      });
    }

    res.json({
      success: true,
      data: dossier,
    });
  } catch (err) {
    console.error('Error fetching batch dossier:', err);
    res.status(500).json({
      success: false,
      error: { code: 'DOSSIER_FETCH_ERROR', message: err.message || 'Failed to fetch batch dossier' },
    });
  }
});

// POST /api/production/batches/:id/start-production
// Activate batch for live production and bind to IoT monitoring session
router.post('/batches/:id/start-production', async (req, res) => {
  try {
    const deviceId = req.body?.device_id || 'SUSTUNO-ESP32-001';
    const result = await startProduction(req.params.id, deviceId);
    res.json({
      success: true,
      data: result,
      message: `Batch ${result.batch_id} is now PRODUCTION_ACTIVE with IoT device ${deviceId}.`,
    });
  } catch (err) {
    console.error('Error starting production:', err);
    res.status(400).json({
      success: false,
      error: { code: 'START_PRODUCTION_ERROR', message: err.message },
    });
  }
});

// POST /api/production/batches/:id/complete
// Complete the batch lifecycle and mark eligible for model training
router.post('/batches/:id/complete', async (req, res) => {
  try {
    const result = await completeBatch(req.params.id, req.body || {});
    res.json({
      success: true,
      data: result,
      message: `Batch ${result.batch_id} marked as BATCH_COMPLETED.`,
    });
  } catch (err) {
    console.error('Error completing batch:', err);
    res.status(400).json({
      success: false,
      error: { code: 'COMPLETE_BATCH_ERROR', message: err.message },
    });
  }
});

// PUT /api/production/batches/:id/status
// Update lifecycle status
router.put('/batches/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_STATUS', message: 'Status is required' },
      });
    }
    const dossier = await getBatchDossier(req.params.id);
    if (!dossier) {
      return res.status(404).json({
        success: false,
        error: { code: 'BATCH_NOT_FOUND', message: `Batch ${req.params.id} not found.` },
      });
    }

    // Update notes with new lifecycle status
    await supabase.from('dye_batches').update({ notes: JSON.stringify({ ...JSON.parse(dossier.notes || '{}'), lifecycle_status: status }) }).eq('id', dossier.id);

    // Also update the status column for backward compatibility
    await supabase.from('dye_batches').update({ status: status.toLowerCase() }).eq('id', dossier.id);

    const updatedDossier = await getBatchDossier(req.params.id);
    res.json({
      success: true,
      data: updatedDossier,
      message: `Batch ${dossier.batch_id} status updated to ${status}.`,
    });
  } catch (err) {
    console.error('Error updating batch status:', err);
    res.status(400).json({
      success: false,
      error: { code: 'STATUS_UPDATE_ERROR', message: err.message || 'Failed to update status' },
    });
  }
});

// GET /api/production/summary
router.get('/summary', async (req, res) => {
  try {
    const { data: batches } = await supabase.from('dye_batches').select('status, data_quality_status, notes');
    const all = batches || [];
    const total = all.length;
    let active = 0;
    let completed = 0;
    let ready = 0;

    for (const b of all) {
      let ls = b.status;
      try {
        if (b.notes && b.notes.startsWith('{')) {
          ls = JSON.parse(b.notes).lifecycle_status || ls;
        }
      } catch {}
      if (ls === 'active' || ls === 'PRODUCTION_ACTIVE' || ls === 'WASTEWATER_MONITORING') active++;
      if (ls === 'completed' || ls === 'BATCH_COMPLETED') completed++;
      if (b.data_quality_status === 'complete') ready++;
    }

    res.json({
      success: true,
      data: {
        total_batches: total,
        active_batches: active,
        completed_batches: completed,
        training_ready_batches: ready,
        note: total === 0 ? 'No production data available.' : 'Live summary from database.',
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { code: 'SUMMARY_ERROR', message: err.message || 'Failed to fetch summary' },
    });
  }
});

module.exports = router;
