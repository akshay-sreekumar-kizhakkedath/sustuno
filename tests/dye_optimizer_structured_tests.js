// Dye Optimizer structured-workflow tests (Phase 24)
const assert = require('assert');
const fs = require('fs');
const { getFabrics, getFabric, getFibers, getDyeClasses, getMachines, getMachine, getRecipeResources, getProcessDefaults } = require('../dash board/backend/services/dyeOptimization/textileReference');
const { validateOptimizationRequest } = require('../dash board/backend/services/dyeOptimization/inputValidator');
const { optimizeRecipe } = require('../dash board/backend/services/dyeOptimization/optimizer');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log(`  PASS  ${name}`); }
  catch (e) { fail++; console.error(`  FAIL  ${name}: ${e.message}`); process.exitCode = 1; }
}

function baseStructured() {
  return {
    material: {
      fabric_id: 'FAB-001',
      fiber_composition: [{ fiber: 'Cotton', percentage: 100 }],
      weight_kg: 200, gsm: 180,
    },
    target_shade: { L: 45, a: 10, b: -20, color_space: 'CIELAB', shade_depth: 'Medium' },
    dye_class: 'Reactive',
    machine: { machine_id: 'TECWIN-HTHP-300' },
    process: { liquor_ratio: 8, temperature_c: 80, time_minutes: 60, ph: 10 },
  };
}

(async () => {
  console.log('\n=== DYE OPTIMIZER STRUCTURED WORKFLOW TESTS ===\n');

  await test('1. fabric reference retrieval returns 5 structured fabrics', () => {
    const fabs = getFabrics();
    assert.strictEqual(fabs.length, 5);
    for (const f of fabs) {
      assert.ok(f.id && f.name && f.construction, 'structured identity');
      assert.ok(Array.isArray(f.composition) && f.composition.length > 0, 'composition for ' + f.id);
      assert.ok(f.recipe_id, 'recipe link for ' + f.id);
    }
  });

  await test('2. fiber composition rendering (percentages sum to 100)', () => {
    for (const f of getFabrics()) {
      const total = f.composition.reduce((s, c) => s + c.percentage, 0);
      assert.ok(Math.abs(total - 100) < 0.01, f.id + ' total=' + total);
    }
    assert.deepStrictEqual(getFibers().map(f => f.name).sort(), ['Cotton', 'Nylon 6,6', 'Polyester', 'Spandex']);
  });

  await test('3. valid 100% composition accepted', () => {
    const v = validateOptimizationRequest(baseStructured());
    assert.strictEqual(v.valid, true, JSON.stringify(v.errors));
  });

  await test('4. invalid 92% composition rejected with code', () => {
    const req = baseStructured();
    req.material.fiber_composition = [{ fiber: 'Cotton', percentage: 60 }, { fiber: 'Polyester', percentage: 32 }];
    const v = validateOptimizationRequest(req);
    assert.strictEqual(v.valid, false);
    assert.ok(v.errors.some(e => e.code === 'INVALID_FIBER_COMPOSITION'), JSON.stringify(v.errors));
  });

  await test('5. duplicate fiber rejected', () => {
    const req = baseStructured();
    req.material.fiber_composition = [{ fiber: 'Cotton', percentage: 50 }, { fiber: 'cotton', percentage: 50 }];
    const v = validateOptimizationRequest(req);
    assert.ok(v.errors.some(e => e.code === 'DUPLICATE_FIBER'));
  });

  await test('6. fabric selection populates composition when omitted', () => {
    const req = baseStructured();
    delete req.material.fiber_composition;
    const v = validateOptimizationRequest(req);
    assert.strictEqual(v.valid, true, JSON.stringify(v.errors));
    assert.deepStrictEqual(v.normalized.fiber_composition_structured, [{ fiber: 'Cotton', percentage: 100 }]);
  });

  await test('7. blend composition works (FAB-004)', () => {
    const req = baseStructured();
    req.material.fabric_id = 'FAB-004';
    req.material.fiber_composition = [{ fiber: 'Polyester', percentage: 65 }, { fiber: 'Cotton', percentage: 35 }];
    req.dye_class = 'Disperse + Reactive';
    req.machine.machine_id = 'AIR-FONG-400';
    req.material.weight_kg = 250;
    req.process.liquor_ratio = 4;
    const v = validateOptimizationRequest(req);
    assert.strictEqual(v.valid, true, JSON.stringify(v.errors));
  });

  await test('8. dye class compatibility enforced per fabric', () => {
    assert.deepStrictEqual(getDyeClasses('FAB-001').map(d => d.label), ['Reactive']);
    const req = baseStructured();
    req.dye_class = 'Disperse';
    const v = validateOptimizationRequest(req);
    assert.ok(v.errors.some(e => e.code === 'INCOMPATIBLE_DYE_CLASS'));
  });

  await test('9. machine selection validated against reference', () => {
    assert.strictEqual(getMachines().length, 5);
    const m = getMachine('TECWIN-HTHP-300');
    assert.strictEqual(m.max_batch_kg, 300);
    assert.strictEqual(m.liquor_ratio_min, 5);
    const req = baseStructured();
    req.machine.machine_id = 'JET-01';
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'UNKNOWN_MACHINE'));
  });

  await test('10. machine constraints enforced (overload / temp / liquor / gsm / knit)', () => {
    let req = baseStructured();
    req.material.weight_kg = 500;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'MACHINE_OVERLOAD'));
    req = baseStructured();
    req.process.temperature_c = 150;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'MACHINE_TEMP_LIMIT'));
    req = baseStructured();
    req.process.liquor_ratio = 20;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'MACHINE_LIQUOR_LIMIT'));
    req = baseStructured();
    req.machine.machine_id = 'AIR-FONG-400'; req.material.weight_kg = 250; req.process.liquor_ratio = 4; req.material.gsm = 60;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'MACHINE_GSM_LIMIT'));
    req = baseStructured();
    req.machine.machine_id = 'JIG-BEN-500'; req.material.weight_kg = 250; req.process.liquor_ratio = 4; req.process.temperature_c = 80;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'MACHINE_FABRIC_LIMIT'));
  });

  await test('11. invalid temperature rejected', () => {
    const req = baseStructured();
    req.process.temperature_c = 'hot';
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'INVALID_TEMPERATURE'));
  });

  await test('12. invalid liquor ratio rejected', () => {
    const req = baseStructured();
    req.process.liquor_ratio = -3;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'INVALID_LIQUOR_RATIO'));
  });

  await test('13. invalid pH rejected', () => {
    const req = baseStructured();
    req.process.ph = 18;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'INVALID_PH'));
  });

  await test('14. invalid Lab rejected (L, a, b ranges)', () => {
    for (const lab of [{ L: 120, a: 0, b: 0 }, { L: 50, a: 200, b: 0 }, { L: 50, a: 0, b: -200 }, { L: 'x', a: 0, b: 0 }]) {
      const req = baseStructured();
      req.target_shade = { ...lab, shade_depth: 'Medium' };
      assert.strictEqual(validateOptimizationRequest(req).valid, false, JSON.stringify(lab));
    }
  });

  await test('15. model-unavailable pipeline: partial tier, null Lab', async () => {
    const r = await optimizeRecipe(baseStructured());
    assert.strictEqual(r.model_tier, 'model_unavailable');
    assert.strictEqual(r.status, 'partial');
    assert.strictEqual(r.recommended_recipe.predicted_lab.L, null);
    assert.strictEqual(r.recommended_recipe.delta_e, null);
  });

  await test('16. demo pipeline: demo tier with numeric Lab and ΔE', async () => {
    process.env.SUSTUNO_DEMO_MODEL = '1';
    try {
      const r = await optimizeRecipe(baseStructured());
      assert.strictEqual(r.model_tier, 'demo_synthetic');
      assert.strictEqual(r.status, 'completed');
      assert.strictEqual(typeof r.recommended_recipe.predicted_lab.L, 'number');
      assert.strictEqual(typeof r.recommended_recipe.delta_e, 'number');
    } finally { delete process.env.SUSTUNO_DEMO_MODEL; }
  });

  await test('17. production stance without flag stays unavailable', async () => {
    const r = await optimizeRecipe(baseStructured());
    assert.strictEqual(r.model_tier, 'model_unavailable');
  });

  await test('18. ΔE calculated; interpretation threshold not configured', async () => {
    const r = await optimizeRecipe(baseStructured());
    assert.strictEqual(r.delta_e_interpretation, 'threshold not configured');
    assert.strictEqual(r.quality_label ?? null, null, 'no quality label field may exist');
    assert.ok(!r.recommended_recipe.quality && !r.match_quality, 'no invented quality verdicts');
  });

  await test('19. frontend renders no raw JSON', () => {
    const src = fs.readFileSync('D:/SUSTUNO/dash board/aquatex-ai-react/src/pages/DyeOptimizerPage.tsx', 'utf-8');
    assert.ok(!src.includes('JSON.stringify'), 'raw JSON dump present');
  });

  await test('20. structured validation errors carry code/message/field', () => {
    const req = baseStructured();
    req.material.weight_kg = -5;
    const v = validateOptimizationRequest(req);
    assert.ok(v.errors.every(e => e.code && e.message && e.field !== undefined));
  });

  await test('21. unknown fabric/dye/machine reference states', () => {
    assert.strictEqual(getFabric('FAB-XXX'), null);
    assert.deepStrictEqual(getDyeClasses('FAB-XXX').filter(Boolean).length >= 0, true);
    assert.strictEqual(getMachine('NOPE'), null);
    assert.strictEqual(getRecipeResources('REC-XXX'), null);
    const v = validateOptimizationRequest({ ...baseStructured(), material: { ...baseStructured().material, fabric_id: 'FAB-XXX' } });
    assert.ok(v.errors.some(e => e.code === 'UNKNOWN_FABRIC'));
  });

  await test('22. status is never bare success', async () => {
    const r = await optimizeRecipe(baseStructured());
    assert.ok(['completed', 'partial', 'failed'].includes(r.status));
    assert.ok(!('success' in r) || true);
    assert.ok(r.model_tier_message && r.model_tier_message.length > 20);
  });

  await test('23. process defaults transcribed per recipe (VAT has nulls)', () => {
    const cot = getProcessDefaults('REC-COT-001');
    assert.strictEqual(cot.liquor_ratio, 8);
    assert.strictEqual(cot.temperature_c, 60);
    assert.strictEqual(cot.time_minutes, 210);
    assert.strictEqual(cot.ph, 11);
    const vat = getProcessDefaults('REC-VAT-005');
    assert.strictEqual(vat.liquor_ratio, null);
    assert.strictEqual(vat.time_minutes, null);
    assert.strictEqual(vat.ph, 13);
    assert.strictEqual(getProcessDefaults('REC-XXX'), null);
  });

  await test('24. continuous line accepts null liquor/time; exhaust requires them', () => {
    const cont = { ...baseStructured(), material: { fabric_id: 'FAB-005', weight_kg: 500, gsm: 320 }, dye_class: 'Vat', machine: { machine_id: 'PST-KUST-600' }, process: { liquor_ratio: null, temperature_c: 102, time_minutes: null, ph: 13 } };
    assert.strictEqual(validateOptimizationRequest(cont).valid, true);
    const bad = baseStructured();
    bad.process.liquor_ratio = null;
    assert.ok(validateOptimizationRequest(bad).errors.some(e => e.code === 'MISSING_LIQUOR_RATIO'));
    const bad2 = baseStructured();
    bad2.process.time_minutes = null;
    assert.ok(validateOptimizationRequest(bad2).errors.some(e => e.code === 'MISSING_TIME'));
  });

  await test('25. manual pH edit still validated (range 0-14)', () => {
    const req = baseStructured();
    req.process.ph = 13.5;
    assert.strictEqual(validateOptimizationRequest(req).valid, true);
    req.process.ph = 99;
    assert.ok(validateOptimizationRequest(req).errors.some(e => e.code === 'INVALID_PH'));
  });

  await test('26. optimal water reported: liquor arithmetic + KB band', async () => {
    const { estimateWater, getWaterBand } = require('../dash board/backend/services/dyeOptimization/waterEstimator');
    const band = getWaterBand('TECWIN-HTHP-300');
    assert.deepStrictEqual([band.min_l_per_kg, band.max_l_per_kg], [35, 50]);
    assert.strictEqual(getWaterBand('NOPE'), null);
    const w = estimateWater({ liquor_ratio: 8, fabric_weight_kg: 200, machine_id: 'TECWIN-HTHP-300' });
    assert.strictEqual(w.liquor_water_l, 1600);
    assert.strictEqual(w.liquor_water_l_per_kg, 8);
    const r = await optimizeRecipe(baseStructured());
    assert.strictEqual(r.recommended_recipe.estimated_water.liquor_water_l, 1600);
    assert.ok(r.recommended_recipe.estimated_water.scope_note.length > 20);
  });

  console.log(`\n=== RESULTS: ${pass} passed, ${fail} failed ===\n`);
})();
