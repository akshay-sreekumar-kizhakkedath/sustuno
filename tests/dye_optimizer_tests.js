// Basic tests for dye optimizer components
// Run with node (not a full test framework installed currently)

const { validateOptimizationRequest } = require('../dash board/backend/services/dyeOptimization/inputValidator');
const { generateCandidates } = require('../dash board/backend/services/dyeOptimization/candidateGenerator');
const { calculateDeltaE, deltaE76 } = require('../dash board/backend/services/dyeOptimization/deltaE');
const { loadRules, evaluateRules } = require('../dash board/backend/services/dyeOptimization/constraintEngine');
const { predictShade, getModelStatus } = require('../dash board/backend/services/dyeOptimization/shadePredictionModel');

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}
function assertTrue(actual, label) {
  if (!actual) throw new Error(`${label}: expected true, got ${actual}`);
}

(async () => {
  try {
    // Case A: Valid input
    const validReq = {
      fiber_composition: ['cotton'],
      fabric_type: 'cotton',
      fabric_weight_kg: 100,
      gsm: 180,
      target_lab: { L: 45, a: 10, b: -20 },
      shade_depth: 'Medium',
      dye_class: 'Reactive',
      available_dyes: ['Reactive Red'],
      available_chemicals: ['Soda Ash'],
      process_constraints: { liquor_ratio: 10, temperature_min: 60, temperature_max: 95, ph_min: 10, ph_max: 11 },
    };
    const v = validateOptimizationRequest(validReq);
    assertTrue(v.valid, 'Valid input validation');
    console.log('PASS: Case A input validation');

    // Case B: Insufficient dye inventory (prototype advisory only; no DB inventory enforcement yet)
    // Verify rules load and evaluate
    const rules = await loadRules();
    assertTrue(rules.length > 0, 'Rules loaded');
    console.log('PASS: Rules loaded (' + rules.length + ')');

    const candResults = await generateCandidates(validReq, { candidateCount: 10 });
    assertTrue(candResults.length > 0, 'Candidate generation');
    console.log('PASS: Candidate generation produced ' + candResults.length + ' candidates');

    // Case D: No model available
    const modelStatus = getModelStatus();
    assertTrue(!modelStatus.available, 'Model unavailable');
    console.log('PASS: Model status unavailable');

    const pred = predictShade({ dye_quantities: candResults[0].dyes });
    assertTrue(pred.model_status === 'not_available', 'Prediction unavailable');
    console.log('PASS: Prediction unavailable behavior');

    // Case E: ΔE calculation
    const de = deltaE76(45, 10, -20, 42, 8, -18);
    assertTrue(typeof de === 'number', 'Delta E is number');
    console.log('PASS: Delta E = ' + de);

    // Rule evaluation with advisory/prototype mode
    const ruleEvals = evaluateRules({ dye_class: 'Reactive', fiber: 'cotton', chemicals: candResults[0].chemicals }, rules, 'advisory');
    assertTrue(Array.isArray(ruleEvals), 'Rule evaluation array');
    console.log('PASS: Rule evaluation returned ' + ruleEvals.length + ' results');

    console.log('\n=== ALL TESTS PASSED ===');
  } catch (e) {
    console.error('TEST FAILED:', e.message || e);
    process.exit(1);
  }
})();
