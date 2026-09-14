// SUSTUNO Dye Shade ML Training Pipeline Tests
// Verifies data quality filters, training refusal when 0/insufficient samples, and inference fallback behaviors.

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildDyeTrainingDataset } = require('../dash board/backend/services/dyeOptimization/datasetBuilder');
const { getModelStatus, predictShade } = require('../dash board/backend/services/dyeOptimization/shadePredictionModel');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=== SUSTUNO DYE SHADE ML PIPELINE TESTS ===\n');

// Test 1: Empty supervised dataset
runTest('1. Empty supervised dataset returns samples_available=0 and training_ready=false', () => {
  const dataset = buildDyeTrainingDataset([]);
  assert.strictEqual(dataset.valid, 0);
  assert.strictEqual(dataset.training_ready, false);
  assert.strictEqual(dataset.dataset_status, 'no_valid_samples');
  assert.strictEqual(dataset.dataset_version, null);
});

// Test 2: Reference recipes are strictly excluded
runTest('2. Reference recipes (data_source=reference_recipe) are strictly excluded from ML dataset', () => {
  const input = [
    { batch_id: 'ref1', data_source: 'reference_recipe', data_quality_status: 'validated', measured_L: 50, measured_a: 10, measured_b: -10, fiber_composition: 'cotton', fabric_type: 'knit', dye_class: 'reactive' }
  ];
  const dataset = buildDyeTrainingDataset(input);
  assert.strictEqual(dataset.valid, 0);
  assert.strictEqual(dataset.reference_recipe_samples, 1);
  assert.strictEqual(dataset.training_ready, false);
});

// Test 3: Synthetic data is strictly excluded by default
runTest('3. Synthetic data (data_source=synthetic) is strictly excluded', () => {
  const input = [
    { batch_id: 'syn1', data_source: 'synthetic', data_quality_status: 'complete', measured_L: 45, measured_a: 12, measured_b: -15, fiber_composition: 'cotton', fabric_type: 'woven', dye_class: 'reactive' }
  ];
  const dataset = buildDyeTrainingDataset(input);
  assert.strictEqual(dataset.valid, 0);
  assert.strictEqual(dataset.synthetic_samples, 1);
  assert.strictEqual(dataset.training_ready, false);
});

// Test 4: Missing measured Lab results are excluded
runTest('4. Batches missing measured L*a*b* are excluded', () => {
  const input = [
    { batch_id: 'b1', data_source: 'real_batch', data_quality_status: 'complete', measured_L: null, measured_a: 10, measured_b: -10, fiber_composition: 'cotton', fabric_type: 'knit', dye_class: 'reactive' }
  ];
  const dataset = buildDyeTrainingDataset(input);
  assert.strictEqual(dataset.valid, 0);
  assert.strictEqual(dataset.missing_lab_results, 1);
});

// Test 5: Draft / Incomplete status excluded
runTest('5. Draft/incomplete batches are excluded', () => {
  const input = [
    { batch_id: 'b2', data_source: 'real_batch', data_quality_status: 'draft', measured_L: 45, measured_a: 10, measured_b: -10, fiber_composition: 'cotton', fabric_type: 'knit', dye_class: 'reactive' }
  ];
  const dataset = buildDyeTrainingDataset(input);
  assert.strictEqual(dataset.valid, 0);
  assert.strictEqual(dataset.invalid_samples, 1);
});

// Test 6: Complete real batch with measured Lab is valid
runTest('6. Valid real batch with measured L*a*b* is accepted', () => {
  const input = [
    { batch_id: 'b3', data_source: 'real_batch', data_quality_status: 'validated', measured_L: 45.2, measured_a: 9.8, measured_b: -19.5, fiber_composition: 'cotton', fabric_type: 'knit', dye_class: 'reactive' }
  ];
  const dataset = buildDyeTrainingDataset(input);
  assert.strictEqual(dataset.valid, 1);
  assert.strictEqual(dataset.real_supervised_samples, 1);
  assert.strictEqual(dataset.dataset_version, 'dye_shade_dataset_v001');
  assert.strictEqual(dataset.training_ready, false); // < 200 threshold
});

// Test 7: Model status when no trained model exists
runTest('7. Model status reports not_available when no trained model artifact exists', () => {
  const status = getModelStatus();
  assert.strictEqual(status.available, false);
  assert.strictEqual(status.status, 'not_available');
  assert.strictEqual(status.model_version, 'none');
});

// Test 8: Inference fallback contract
runTest('8. predictShade returns null coordinates and confidence=null when model unavailable', () => {
  const res = predictShade({ fabric: 'cotton', dye_class: 'reactive' });
  assert.strictEqual(res.model_status, 'not_available');
  assert.strictEqual(res.L, null);
  assert.strictEqual(res.a, null);
  assert.strictEqual(res.b, null);
  assert.strictEqual(res.confidence, null);
});

// Test 9: Python extract_dye_batches.py script test
runTest('9. Python extract_dye_batches.py runs cleanly and generates dataset manifest', () => {
  const script = path.join(__dirname, '..', 'dash board', 'ml', 'data', 'extract_dye_batches.py');
  const stdout = execFileSync('python', [script], { encoding: 'utf-8' });
  assert.ok(stdout.includes('Extraction complete'));
});

// Test 10: Python train_shade_model.py training refusal test
runTest('10. Python train_shade_model.py refuses to train on 0 valid samples (exit code 2)', () => {
  const script = path.join(__dirname, '..', 'dash board', 'ml', 'training', 'train_shade_model.py');
  try {
    execFileSync('python', [script], { encoding: 'utf-8' });
    assert.fail('train_shade_model.py should have exited with code 2');
  } catch (err) {
    assert.strictEqual(err.status, 2);
    assert.ok(err.stdout.includes('BLOCKED: Model training REFUSED'));
  }
});

// Test 11: Python validate_dataset.py script test
runTest('11. Python validate_dataset.py passes on extracted dataset manifest', () => {
  const script = path.join(__dirname, '..', 'dash board', 'ml', 'data', 'validate_dataset.py');
  const stdout = execFileSync('python', [script], { encoding: 'utf-8' });
  assert.ok(stdout.includes('Validation completed'));
});

// Test 12: Python predict_shade.py fallback test
runTest('12. Python predict_shade.py CLI returns not_available when no active model', () => {
  const script = path.join(__dirname, '..', 'dash board', 'ml', 'inference', 'predict_shade.py');
  const stdout = execFileSync('python', [script, '--input', '{}'], { encoding: 'utf-8' });
  const parsed = JSON.parse(stdout);
  assert.strictEqual(parsed.model_status, 'not_available');
  assert.strictEqual(parsed.predicted_lab.L, null);
});

console.log('\n=== ALL 12 ML PIPELINE TESTS COMPLETED ===\n');
