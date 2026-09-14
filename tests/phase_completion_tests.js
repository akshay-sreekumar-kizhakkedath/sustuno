// SUSTUNO Phase-Completion Tests (no live DB writes; pure services + contracts)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { optimizeRecipe } = require('../dash board/backend/services/dyeOptimization/optimizer');
const { buildDyeTrainingDataset } = require('../dash board/backend/services/dyeOptimization/datasetBuilder');
const { getModelStatus, predictShade } = require('../dash board/backend/services/dyeOptimization/shadePredictionModel');
const { predictWastewaterProfile } = require('../dash board/backend/services/wastewater/wastewaterPredictor');
const { evaluateEtpDecision } = require('../dash board/backend/services/etp/etpDecisionEngine');
const { isMissingTableError } = require('../dash board/backend/database/schemaGuard');

let pass = 0, fail = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { pass++; console.log(`  PASS  ${name}`); },
    (e) => { fail++; console.error(`  FAIL  ${name}: ${e.message}`); process.exitCode = 1; }
  );
}

const validReq = {
  fiber_composition: ['cotton'], fabric_type: 'cotton', fabric_weight_kg: 100, gsm: 180,
  target_lab: { L: 45, a: 10, b: -20 }, shade_depth: 'Medium', dye_class: 'Reactive',
  available_dyes: ['Reactive Red R-3B'], available_chemicals: ['Soda Ash'],
};

(async () => {
  console.log('\n=== SUSTUNO PHASE-COMPLETION TESTS ===\n');

  await test('OPT-1 valid request runs pipeline with model_status=not_available and no fabricated Lab', async () => {
    const r = await optimizeRecipe(validReq);
    assert.ok(['completed', 'partial'].includes(r.status), 'expected completed/partial, got ' + r.status);
    assert.strictEqual(r.model_tier, 'model_unavailable');
    for (const c of r.ranked_candidates || []) {
      assert.strictEqual(c.predicted_lab.L, null);
      assert.strictEqual(c.delta_e, null);
    }
  });

  await test('OPT-2 invalid request fails validation cleanly', async () => {
    const r = await optimizeRecipe({ fabric_type: 'cotton' });
    assert.strictEqual(r.status, 'failed');
    assert.ok((r.errors || []).length > 0);
  });

  await test('ML-1 model status is not_available with 0 supervised samples', () => {
    const s = getModelStatus();
    assert.strictEqual(s.status, 'not_available');
    assert.strictEqual(s.model_version, 'none');
    const p = predictShade({ dye_class: 'Reactive' });
    assert.strictEqual(p.model_status, 'not_available');
    assert.strictEqual(p.L, null); assert.strictEqual(p.confidence, null);
  });

  await test('ML-2 demo model stays OFF unless SUSTUNO_DEMO_MODEL=1', () => {
    const { demoExists } = require('../dash board/backend/services/dyeOptimization/shadePredictionModel');
    assert.strictEqual(process.env.SUSTUNO_DEMO_MODEL, undefined);
    assert.strictEqual(demoExists(), false);
  });

  await test('ML-3 demo inference CLI returns demo_synthetic Lab only with flag', () => {
    const { execFileSync } = require('child_process');
    const script = 'D:/SUSTUNO/dash board/ml/inference/predict_shade.py';
    const payload = JSON.stringify([{ fabric: 'cotton', dye_class: 'Reactive', dyes: [{ percentage_owf: 1.0 }], temperature: 80 }]);
    const out = execFileSync('python', [script], { input: payload, encoding: 'utf-8', timeout: 90000, env: { ...process.env, SUSTUNO_DEMO_MODEL: '1' } });
    const r = JSON.parse(out);
    assert.strictEqual(r.model_status, 'demo_synthetic');
    assert.strictEqual(typeof r.results[0].L, 'number');
    assert.strictEqual(r.confidence, null);
    assert.strictEqual(r.demo, true);
  });

  await test('DATA-1 dataset builder accepts only validated measured batches', () => {
    const good = { batch_id: 'b1', data_quality_status: 'complete', data_source: 'real_batch', fiber_composition: ['cotton'], fabric_type: 'cotton', dye_class: 'Reactive', measured_L: 45, measured_a: 10, measured_b: -20 };
    const ds = buildDyeTrainingDataset([
      good,
      { ...good, batch_id: 'b2', measured_L: null },
      { ...good, batch_id: 'b3', data_source: 'reference_recipe' },
      { ...good, batch_id: 'b4', data_source: 'synthetic' },
      { ...good, batch_id: 'b5', data_quality_status: 'draft' },
    ]);
    assert.strictEqual(ds.valid, 1);
    assert.strictEqual(ds.training_ready, false);
    assert.strictEqual(ds.dataset_status, 'insufficient_samples');
  });

  await test('WW-1 wastewater returns not_available with all-null profile', () => {
    const r = predictWastewaterProfile({ dye_class: 'Reactive' });
    assert.strictEqual(r.prediction_status, 'not_available');
    for (const k of ['pH', 'EC', 'TDS', 'turbidity', 'COD', 'BOD', 'color', 'flow']) assert.strictEqual(r.predicted_profile[k], null);
    assert.ok(Object.keys(r.model_versions || {}).length === 0);
  });

  await test('ETP-1 empty input returns insufficient_data without crashing', () => {
    const r = evaluateEtpDecision({});
    assert.strictEqual(r.recommendation_status, 'insufficient_data');
    assert.strictEqual(r.dosing.status, 'insufficient_data');
    assert.ok(Array.isArray(r.rules) && r.rules.length === 13);
    assert.ok(r.rules.every(x => x.human_validation_status === 'pending'));
    for (const f of ['recommendation', 'reason', 'evidence', 'model_status', 'warnings', 'assumptions']) assert.ok(r[f] !== undefined, 'missing ' + f);
  });

  await test('ETP-2 no auto control claims; limitations disclosed', () => {
    const r = evaluateEtpDecision({ recipe: { dye_class: 'Reactive' }, wastewater_profile: { COD: 620, pH: 7 }, plant_config: { jar_test_data: 'lab-1' } });
    assert.strictEqual(r.dosing.status, 'advisory_calculated');
    assert.ok(JSON.stringify(r.limits || r.limitations).toLowerCase().includes('advisory') || r.limitations.join(' ').includes('auto-control'));
  });

  await test('GUARD-1 schemaGuard detects missing-table errors only', () => {
    assert.strictEqual(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.dye_batches' in the schema cache" }), true);
    assert.strictEqual(isMissingTableError(null), false);
    assert.strictEqual(isMissingTableError({ code: '42501', message: 'permission denied' }), false);
  });

  await test('KB-1 master KB: 619 records, unique IDs; 13 rules all pending', () => {
    const kb = JSON.parse(fs.readFileSync('D:/SUSTUNO/mater_knowledge_base/master_knowledge_base.json', 'utf-8'));
    assert.strictEqual(kb.knowledge_records.length, 619);
    assert.strictEqual(new Set(kb.knowledge_records.map(r => r.knowledge_id)).size, 619);
    const rb = JSON.parse(fs.readFileSync('D:/SUSTUNO/mater_knowledge_base/rule_base.json', 'utf-8'));
    const rules = rb.rules || rb.rule_base || [];
    assert.strictEqual(rules.length, 13);
    assert.ok(rules.every(r => (r.human_validation_status || 'pending') === 'pending'));
  });

  await test('API-1 route contracts expose required non-IoT endpoints', () => {
    const read = (p) => fs.readFileSync(path.join('D:/SUSTUNO/dash board/backend/routes', p), 'utf-8');
    const dye = read('dyeBatchRoutes.js');
    assert.ok(dye.includes('/:id/intelligence') && dye.includes('/:id/comparison'));
    const ml = read('mlRoutes.js');
    assert.ok(ml.includes('/status') && ml.includes('/predict-shade') && ml.includes('/dye-dataset/readiness'));
    const srv = fs.readFileSync('D:/SUSTUNO/dash board/backend/server.js', 'utf-8');
    for (const m of ['/api/optimization', '/api/dye-batches', '/api/ml', '/api/wastewater', '/api/etp', '/api/production', '/api/overview', '/api/analytics', '/api/reports']) assert.ok(srv.includes(`'${m}'`), 'missing mount ' + m);
  });

  await test('SEC-1 service role key never shipped to frontend', () => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : walk(p);
      return /\.(ts|tsx|js|json)$/.test(e.name) ? [p] : [];
    });
    const hits = walk('D:/SUSTUNO/dash board/aquatex-ai-react/src').filter(p => /SERVICE_ROLE/i.test(fs.readFileSync(p, 'utf-8')));
    assert.strictEqual(hits.length, 0, 'service key reference in frontend: ' + hits.join(','));
    assert.ok(fs.existsSync('D:/SUSTUNO/dash board/backend/.gitignore') && /^\.env$/m.test(fs.readFileSync('D:/SUSTUNO/dash board/backend/.gitignore', 'utf-8')));
  });

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===\n`);
})();
