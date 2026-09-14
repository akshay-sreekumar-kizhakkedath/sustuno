// Dataset Builder — produces training-ready dataset from batch records
// Strictly excludes reference recipes, synthetic records, and unmeasured batches.

function buildDyeTrainingDataset(batchRecords) {
  const valid = [];
  const rejected = [];
  let referenceCount = 0;
  let syntheticCount = 0;
  let missingLabCount = 0;
  let missingRecipeCount = 0;
  let invalidCount = 0;

  for (const b of batchRecords || []) {
    const quality = b.data_quality_status || 'incomplete';
    const source = b.data_source || 'unknown';

    if (source === 'reference_recipe') {
      referenceCount++;
      rejected.push({ id: b.batch_id, reason: 'data_source=reference_recipe is not a measured supervised outcome' });
      continue;
    }

    if (source === 'synthetic') {
      syntheticCount++;
      rejected.push({ id: b.batch_id, reason: 'data_source=synthetic is excluded from production ML training' });
      continue;
    }

    if (quality === 'draft' || quality === 'incomplete' || quality === 'rejected') {
      invalidCount++;
      rejected.push({ id: b.batch_id, reason: 'data_quality_status=' + quality });
      continue;
    }

    // Check measured Lab
    if (b.measured_L === null || b.measured_a === null || b.measured_b === null || b.measured_L === undefined) {
      missingLabCount++;
      rejected.push({ id: b.batch_id, reason: 'missing_measured_lab' });
      continue;
    }

    // Check material and dye inputs
    if (!b.dye_class || !b.fiber_composition || !b.fabric_type) {
      missingRecipeCount++;
      rejected.push({ id: b.batch_id, reason: 'missing_recipe_material' });
      continue;
    }

    valid.push({
      batch_id: b.batch_id,
      features: {
        fiber_composition: b.fiber_composition,
        fabric_type: b.fabric_type,
        dye_class: b.dye_class,
      },
      targets: {
        measured_L: b.measured_L,
        measured_a: b.measured_a,
        measured_b: b.measured_b,
      },
      delta_e_76: b.delta_e_76,
      source: source,
    });
  }

  const MIN_SAMPLES = 200;
  const isReady = valid.length >= MIN_SAMPLES;

  return {
    version: 'dye_shade_dataset_v001',
    created_at: new Date().toISOString(),
    total_input: (batchRecords || []).length,
    valid: valid.length,
    rejected: rejected.length,
    samples_available: valid.length,
    training_ready: isReady,
    minimum_configured_samples: MIN_SAMPLES,
    real_supervised_samples: valid.length,
    reference_recipe_samples: referenceCount,
    synthetic_samples: syntheticCount,
    missing_lab_results: missingLabCount,
    missing_recipe_data: missingRecipeCount,
    invalid_samples: invalidCount + missingRecipeCount,
    dataset_version: valid.length > 0 ? 'dye_shade_dataset_v001' : null,
    dataset_status: isReady ? 'potential_training_ready' : (valid.length > 0 ? 'insufficient_samples' : 'no_valid_samples'),
    note: 'Model training blocked until at least 200 validated supervised batches with measured L*a*b* outcomes are collected. Reference recipes and synthetic data cannot be used for ML training.',
  };
}

module.exports = { buildDyeTrainingDataset };
