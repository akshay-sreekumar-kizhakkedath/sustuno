// Wastewater Profile API Routes
const express = require('express');
const router = express.Router();
const { predictWastewaterProfile } = require('../services/wastewater/wastewaterPredictor');
const { getBatchDossier } = require('../services/workflowService');

// POST /api/wastewater/predict
// Standalone prediction endpoint (kept for backward compatibility)
router.post('/predict', (req, res) => {
  try {
    const input = req.body || {};
    const prediction = predictWastewaterProfile(input);
    res.json({
      success: true,
      data: prediction,
    });
  } catch (err) {
    console.error('Error predicting wastewater profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'WASTEWATER_PREDICTION_ERROR',
        message: err.message || 'Failed to predict wastewater profile',
      },
    });
  }
});

// GET /api/wastewater/batches/:id
// Retrieves persisted or generated wastewater prediction for a specific batch
router.get('/batches/:id', async (req, res) => {
  try {
    const dossier = await getBatchDossier(req.params.id);
    if (!dossier) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: `Batch ${req.params.id} not found.`,
        },
      });
    }

    // If batch does not have a prediction yet, generate it on demand from its recipe
    let prediction = dossier.prediction;
    if (!prediction) {
      const plannedProc = (dossier.process || []).find(p => p.process_type === 'planned') || {};
      prediction = predictWastewaterProfile({
        recipe: {
          dye_class: dossier.dye_class,
          dyes: dossier.dyes || [],
          chemicals: dossier.chemicals || [],
        },
        process: {
          liquor_ratio: plannedProc.liquor_ratio,
          temperature: plannedProc.temperature,
          time_minutes: plannedProc.time_minutes,
          ph: plannedProc.ph,
        },
        batch: {
          fabric_weight_kg: dossier.fabric_weight_kg,
          gsm: dossier.gsm,
          machine_id: dossier.machine,
        },
      });
    }

    res.json({
      success: true,
      data: {
        batch_id: dossier.batch_id,
        prediction,
        comparison: dossier.comparison,
        measured_profile: dossier.telemetry.length > 0 ? dossier.telemetry[0] : null,
        note: dossier.telemetry.length > 0
          ? `${dossier.telemetry.length} IoT sensor readings recorded for this batch.`
          : 'Awaiting live IoT sensor telemetry.',
      },
    });
  } catch (err) {
    console.error('Error fetching batch wastewater profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'WASTEWATER_FETCH_ERROR',
        message: err.message || 'Failed to fetch wastewater profile',
      },
    });
  }
});

// POST /api/wastewater/batches/:id/generate
// Generate and persist wastewater profile and engineering estimates using confirmed recipe data from dye_batches
router.post('/batches/:id/generate', async (req, res) => {
  try {
    const dossier = await getBatchDossier(req.params.id);
    if (!dossier) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BATCH_NOT_FOUND',
          message: `Batch ${req.params.id} not found.`,
        },
      });
    }

    // Check if prediction already exists
    if (dossier.prediction) {
      return res.json({
        success: true,
        data: dossier.prediction,
        message: 'Wastewater prediction already generated for this batch.',
      });
    }

    // Generate prediction from confirmed recipe
    const prediction = predictWastewaterProfile({
      recipe: {
        dye_class: dossier.dye_class,
        dyes: dossier.original_input?.dyes || [],
        chemicals: dossier.original_input?.chemicals || [],
      },
      process: dossier.original_input?.process || {},
      batch: {
        fabric_weight_kg: dossier.fabric_weight_kg,
        gsm: dossier.gsm,
        machine_id: dossier.machine,
      },
    });

    // Persist to wastewater_predictions table
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
      // Non-fatal if table not yet migrated - prediction stored in memory only
      console.warn('[Wastewater] DB persist skipped (migration pending):', err.message);
    }

    // Update dossier with prediction
    await updateBatchDossierPrediction(dossier.id, prediction);

    res.json({
      success: true,
      data: prediction,
      message: 'Wastewater profile generated and persisted successfully.',
    });
  } catch (err) {
    console.error('Error generating wastewater profile:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'WASTEWATER_GENERATE_ERROR',
        message: err.message || 'Failed to generate wastewater profile',
      },
    });
  }
});

// Helper to update prediction in batch dossier metadata
async function updateBatchDossierPrediction(batchId, prediction) {
  const { data } = await supabase.from('dye_batches').select('notes').eq('id', batchId).maybeSingle();
  let current = {};
  try {
    if (data?.notes && data.notes.startsWith('{')) current = JSON.parse(data.notes);
  } catch {}

  const merged = {
    ...current,
    prediction: {
      ...prediction,
      prediction_status: prediction.prediction_status || 'not_available',
    },
    updated_at: new Date().toISOString(),
  };

  await supabase.from('dye_batches').update({ notes: JSON.stringify(merged) }).eq('id', batchId);
}

module.exports = router;
