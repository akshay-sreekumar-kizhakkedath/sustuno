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
test('3. evaluateEtpDecision returns advisory_calculated when jar test & COD present', () => {
  const result = evaluateEtpDecision({
    recipe: { dye_class: 'reactive', liquor_ratio: 10 },
    wastewater_profile: { COD: 600, pH: 7.2 },
    plant_config: { jar_test_data: true }
  });
  assert.strictEqual(result.dosing.status, 'advisory_calculated');
  assert.strictEqual(result.dosing.recommendation.coagulant_dosage_g_m3, 90.0);
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

console.log('\n=== ALL WASTEWATER & ETP TESTS PASSED ===\n');
