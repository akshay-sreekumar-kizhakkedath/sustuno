// Wastewater & ETP Decision Support Tests
const assert = require('assert');
const { predictWastewaterProfile } = require('../dash board/backend/services/wastewater/wastewaterPredictor');
const { evaluateEtpDecision } = require('../dash board/backend/services/etp/etpDecisionEngine');

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (e) {
    console.error(`  FAIL  ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=== WASTEWATER & ETP DECISION SUPPORT TESTS ===\n');

// Test 1: Wastewater profile prediction fallback
test('1. predictWastewaterProfile returns prediction_status=not_available when no trained model exists', () => {
  const result = predictWastewaterProfile({ dye_class: 'reactive' });
  assert.strictEqual(result.prediction_status, 'not_available');
  assert.strictEqual(result.predicted_profile.COD, null);
  assert.strictEqual(result.predicted_profile.BOD, null);
  assert.strictEqual(result.predicted_profile.pH, null);
  assert.ok(result.warnings.length > 0);
});

// Test 2: ETP Decision Engine with missing jar tests
test('2. evaluateEtpDecision returns insufficient_data for chemical dosing when jar test is missing', () => {
  const result = evaluateEtpDecision({
    recipe: { dye_class: 'reactive', liquor_ratio: 10 },
    wastewater_profile: { COD: 600, pH: 7.2 }
  });
  assert.strictEqual(result.dosing.status, 'insufficient_data');
  assert.strictEqual(result.dosing.recommendation, null);
  assert.ok(result.dosing.warning.includes('jar-test'));
});

// Test 3: ETP Decision Engine with full jar test & COD data
test('3. evaluateEtpDecision returns KB reference dosing range when jar test & COD present', () => {
  const result = evaluateEtpDecision({
    recipe: { dye_class: 'reactive', liquor_ratio: 10 },
    wastewater_profile: { COD: 600, pH: 7.2 },
    plant_config: { jar_test_data: true }
  });
  // KB-grounded: advisory reference RANGE, never a fabricated point dosage.
  assert.strictEqual(result.dosing.status, 'advisory_reference_range');
  assert.ok(result.dosing.recommendation.coagulant.kb_dosage_range_mg_l, 'KB coagulant range present');
  assert.ok(result.dosing.recommendation.coagulant.dosages_from_kb_or_jar_test === true);
  assert.strictEqual(result.dosing.recommendation.exact_dosing_g_m3, 'Not computed — exact dosing requires jar-test calibration against the KB reference range.');
  assert.strictEqual(result.recommendation_status, 'advisory_generated');
});

// Test 4: ETP KB Rules have pending validation status
test('4. evaluateEtpDecision preserves human_validation_status=pending on rules', () => {
  const result = evaluateEtpDecision({ recipe: { dye_class: 'reactive' } });
  assert.ok(result.rules.length > 0, 'Rules should be evaluated');
  for (const r of result.rules) {
    assert.strictEqual(r.human_validation_status, 'pending');
  }
});

// Test 5: Explainability structure check
test('5. evaluateEtpDecision outputs full explainability fields', () => {
  const result = evaluateEtpDecision({ recipe: { dye_class: 'reactive' } });
  assert.ok(result.recommendation);
  assert.ok(result.reason);
  assert.ok(Array.isArray(result.evidence));
  assert.ok(Array.isArray(result.strategies));
  assert.ok(Array.isArray(result.assumptions));
  assert.ok(Array.isArray(result.limitations));
  assert.ok(result.limitations.some(l => l.includes('Advisory decision support only')));
});

// Test 6: Engineering estimates are transparent arithmetic, never ML/measured chemistry
test('6. engineering_estimates computed from recipe arithmetic, never fabricated chemistry', () => {
  const result = predictWastewaterProfile({
    recipe: { fabric_weight_kg: 500, liquor_ratio: '1:10', process: { ph: 7.3 } }
  });
  assert.strictEqual(result.prediction_status, 'not_available');
  assert.strictEqual(result.predicted_profile.COD, null);
  assert.strictEqual(result.predicted_profile.BOD, null);
  assert.ok(result.engineering_estimates.dye_bath_volume_m3 === 5.0, '500 kg × 10 L/kg / 1000 = 5 m³');
  assert.strictEqual(result.engineering_estimates.expected_bath_pH, 7.3);
  assert.strictEqual(result.engineering_estimates.basis, 'dye_bath_arithmetic');
  assert.ok(String(result.predicted_profile.COD ?? 'null') === 'null');
});

// Test 7: No input → empty engineering estimates (no invented defaults)
test('7. engineering_estimates empty when no arithmetic basis present', () => {
  const result = predictWastewaterProfile({ dye_class: 'reactive' });
  assert.deepStrictEqual(result.engineering_estimates, {});
});

console.log('\n=== ALL WASTEWATER & ETP TESTS PASSED ===\n');
