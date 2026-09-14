// Dye Batch Pipeline Tests
// Tests for the data collection pipeline: batch creation, actual process recording,
// measured Lab recording, delta-E calculation, and training readiness gating.
// These run without a live DB — all Supabase calls are mocked in-process.

const assert = require('assert');
const { buildDyeTrainingDataset } = require('../dash board/backend/services/dyeOptimization/datasetBuilder');
const { deltaE76, calculateDeltaE } = require('../dash board/backend/services/dyeOptimization/deltaE');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== DYE BATCH PIPELINE TESTS ===\n');

// ---------------------------------------------------------------------------
// 1. Batch schema: complete real batch → training_ready = true
// ---------------------------------------------------------------------------
console.log('-- Dataset Builder --');

test('CASE A: Complete real batch → valid count = 1, insufficient_samples for dataset training', () => {
  const batches = [{
    batch_id: 'batch-001',
    data_quality_status: 'validated',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
    measured_L: 45.2,
    measured_a: 12.1,
    measured_b: -8.3,
  }];
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 1, `valid count should be 1, got ${result.valid}`);
  assert.strictEqual(result.training_ready, false, 'training_ready should be false for < 200 samples');
  assert.ok(result.dataset_status === 'insufficient_samples', `dataset_status should be insufficient_samples, got ${result.dataset_status}`);
});

test('CASE B: No measured Lab → training_ready = false', () => {
  const batches = [{
    batch_id: 'batch-002',
    data_quality_status: 'complete',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'knit',
    dye_class: 'reactive',
    measured_L: null,
    measured_a: null,
    measured_b: null,
  }];
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 0, 'valid should be 0');
  assert.strictEqual(result.training_ready, false, 'training_ready should be false');
  assert.strictEqual(result.missing_lab_results, 1, 'missing_lab_results should be 1');
});

test('CASE C: Draft status → rejected', () => {
  const batches = [{
    batch_id: 'batch-003',
    data_quality_status: 'draft',
    data_source: 'real_batch',
    fiber_composition: ['polyester'],
    fabric_type: 'woven',
    dye_class: 'disperse',
    measured_L: 60.0,
    measured_a: -5.0,
    measured_b: 20.0,
  }];
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 0, 'draft batch should not be valid');
  assert.strictEqual(result.rejected, 1, 'should count as rejected');
});

test('CASE D: reference_recipe source → rejected (not eligible for real model)', () => {
  const batches = [{
    batch_id: 'ref-001',
    data_quality_status: 'validated',
    data_source: 'reference_recipe',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
    measured_L: 50.0,
    measured_a: 0.0,
    measured_b: 0.0,
  }];
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 0, 'reference_recipe should not be valid');
  assert.strictEqual(result.rejected, 1, 'reference_recipe should be rejected');
});

test('CASE E: Missing recipe material → rejected', () => {
  const batches = [{
    batch_id: 'batch-004',
    data_quality_status: 'complete',
    data_source: 'real_batch',
    fiber_composition: null,  // missing
    fabric_type: null,         // missing
    dye_class: null,          // missing
    measured_L: 55.0,
    measured_a: 10.0,
    measured_b: -5.0,
  }];
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 0, 'missing recipe fields should not be valid');
  assert.strictEqual(result.missing_recipe_data, 1, 'should flag missing_recipe_data');
});

test('Dataset versioning: version field is always present', () => {
  const result = buildDyeTrainingDataset([]);
  assert.ok(result.version, 'version should be present');
  assert.ok(result.created_at, 'created_at should be present');
});

test('Dataset status: 200+ valid batches → potential_training_ready', () => {
  const batches = Array.from({ length: 200 }, (_, i) => ({
    batch_id: `b-${i}`,
    data_quality_status: 'validated',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
    measured_L: 50 + i * 0.01,
    measured_a: 5.0,
    measured_b: -3.0,
  }));
  const result = buildDyeTrainingDataset(batches);
  assert.strictEqual(result.valid, 200, `expected 200 valid, got ${result.valid}`);
  assert.strictEqual(result.dataset_status, 'potential_training_ready', `expected potential_training_ready, got ${result.dataset_status}`);
});

test('Empty input returns no_valid_samples', () => {
  const result = buildDyeTrainingDataset([]);
  assert.strictEqual(result.valid, 0);
  assert.strictEqual(result.training_ready, false);
  assert.strictEqual(result.dataset_status, 'no_valid_samples');
});

test('Null input handled safely (no crash)', () => {
  const result = buildDyeTrainingDataset(null);
  assert.strictEqual(result.valid, 0);
  assert.strictEqual(result.total_input, 0);
});

// ---------------------------------------------------------------------------
// 2. Delta-E calculations
// ---------------------------------------------------------------------------
console.log('\n-- Delta-E Calculations --');

test('Actual ΔE76 calculation: perfect match → 0', () => {
  const dE = deltaE76(50, 10, -5, 50, 10, -5);
  assert.strictEqual(dE, 0, 'same Lab → ΔE = 0');
});

test('Actual ΔE76 calculation: known offset → correct value', () => {
  // sqrt(3² + 4²) = 5
  const dE = deltaE76(50, 20, 30, 53, 24, 30);
  assert.ok(Math.abs(dE - 5.0) < 0.001, `expected 5.0, got ${dE}`);
});

test('calculateDeltaE returns null when predicted Lab is null (model unavailable)', () => {
  const dE = calculateDeltaE(null, { L: 50, a: 10, b: -5 });
  assert.strictEqual(dE, null, 'should return null when predicted is null');
});

test('calculateDeltaE returns null when target Lab is null', () => {
  const dE = calculateDeltaE({ L: 50, a: 10, b: -5 }, null);
  assert.strictEqual(dE, null, 'should return null when target is null');
});

test('calculateDeltaE returns numeric value when both Labs are present', () => {
  const dE = calculateDeltaE({ L: 50, a: 10, b: -5 }, { L: 50, a: 10, b: -5 });
  assert.strictEqual(dE, 0, 'same Lab through wrapper → ΔE = 0');
});

// ---------------------------------------------------------------------------
// 3. Batch training-readiness logic (pure, no DB)
// ---------------------------------------------------------------------------
console.log('\n-- Batch Readiness Logic --');

function checkBatchReadiness(batch, shadeResults) {
  // Mirror the logic from the route handler — testable without HTTP
  const issues = [];
  if (batch.data_quality_status === 'draft' || batch.data_quality_status === 'incomplete') {
    issues.push('data_quality_status is ' + batch.data_quality_status);
  }
  if (batch.data_source === 'reference_recipe' || batch.data_source === 'synthetic') {
    issues.push('data_source=' + batch.data_source + ' is not eligible');
  }
  const realResult = (shadeResults || []).find(r => r.data_source === 'real_batch');
  if (!realResult) {
    issues.push('missing measured Lab result');
  } else {
    if (realResult.measured_L === null) issues.push('measured_L is null');
    if (realResult.measured_a === null) issues.push('measured_a is null');
    if (realResult.measured_b === null) issues.push('measured_b is null');
  }
  if (!batch.fiber_composition) issues.push('missing fiber_composition');
  if (!batch.fabric_type) issues.push('missing fabric_type');
  if (!batch.dye_class) issues.push('missing dye_class');
  return { training_ready: issues.length === 0, issues };
}

test('Complete real batch with measured Lab → training_ready = true', () => {
  const batch = {
    data_quality_status: 'validated',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
  };
  const results = [{ data_source: 'real_batch', measured_L: 48.2, measured_a: 11.0, measured_b: -7.5 }];
  const { training_ready, issues } = checkBatchReadiness(batch, results);
  assert.strictEqual(training_ready, true, `Expected ready, issues: ${JSON.stringify(issues)}`);
  assert.strictEqual(issues.length, 0);
});

test('Incomplete status → training_ready = false', () => {
  const batch = {
    data_quality_status: 'incomplete',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
  };
  const results = [{ data_source: 'real_batch', measured_L: 48.2, measured_a: 11.0, measured_b: -7.5 }];
  const { training_ready } = checkBatchReadiness(batch, results);
  assert.strictEqual(training_ready, false);
});

test('Missing dye class → flagged in issues', () => {
  const batch = {
    data_quality_status: 'complete',
    data_source: 'real_batch',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: null,
  };
  const results = [{ data_source: 'real_batch', measured_L: 48.2, measured_a: 11.0, measured_b: -7.5 }];
  const { training_ready, issues } = checkBatchReadiness(batch, results);
  assert.strictEqual(training_ready, false);
  assert.ok(issues.some(i => i.includes('dye_class')), 'should flag missing dye_class');
});

test('Synthetic data_source → flagged, not eligible', () => {
  const batch = {
    data_quality_status: 'validated',
    data_source: 'synthetic',
    fiber_composition: ['cotton'],
    fabric_type: 'woven',
    dye_class: 'reactive',
  };
  const results = [{ data_source: 'real_batch', measured_L: 48.2, measured_a: 11.0, measured_b: -7.5 }];
  const { training_ready, issues } = checkBatchReadiness(batch, results);
  assert.strictEqual(training_ready, false);
  assert.ok(issues.some(i => i.includes('synthetic')), 'should flag synthetic source');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
