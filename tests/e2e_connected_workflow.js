// SUSTUNO CONNECTED END-TO-END WORKFLOW INTEGRATION TEST
// Validates the full connected batch lifecycle:
// Production Order → Optimization → Batch Creation → Production → Shade → Wastewater → ETP → Report → Training
// Run: node tests/e2e_connected_workflow.js

const { supabase } = require('D:/SUSTUNO/dash board/backend/database/supabaseClient');
const batchLifecycle = require('D:/SUSTUNO/dash board/backend/services/batchLifecycleService');
const { getBatchDossier } = require('D:/SUSTUNO/dash board/backend/services/workflowService');
const { deltaE76 } = require('D:/SUSTUNO/dash board/backend/services/dyeOptimization/deltaE');

const report = { generatedAt: new Date().toISOString(), steps: [], passed: 0, failed: 0 };

function step(name, ok, detail) {
  if (ok) { report.passed++; console.log(`  [PASS] ${name}`); }
  else { report.failed++; console.log(`  [FAIL] ${name}: ${detail || ''}`); }
  report.steps.push({ name, ok, detail });
}

// Track created IDs for cleanup
const createdIds = { batchId: null, orderId: null };

async function cleanup() {
  if (createdIds.batchId) {
    try {
      await supabase.from('dye_batch_shade_results').delete().eq('batch_id', createdIds.batchId);
      await supabase.from('dye_batch_chemicals').delete().eq('batch_id', createdIds.batchId);
      await supabase.from('dye_batch_dyes').delete().eq('batch_id', createdIds.batchId);
      await supabase.from('dye_batch_process').delete().eq('batch_id', createdIds.batchId);
      await supabase.from('dye_batches').delete().eq('id', createdIds.batchId);
    } catch {}
  }
}

async function run() {
  console.log('\n=== SUSTUNO CONNECTED WORKFLOW E2E TEST ===\n');

  try {
    // PHASE 1: Create Production Order
    console.log('=== PHASE 1: Create Production Order ===');
    const orderResult = await batchLifecycle.createProductionOrder({
      customer: 'Test Customer E2E',
      fabric_type: 'Cotton Single Jersey Knit',
      fiber_composition: [{ fiber: 'Cotton', percentage: 100 }],
      batch_weight_kg: 100,
      gsm: 180,
      target_shade: { L: 45, a: 10, b: -20, shade_depth: 'Medium' },
      dye_class: 'Reactive',
      machine: 'TECWIN-HTHP-300',
    });
    step('Production order created', orderResult.success, orderResult.order_number);
    if (orderResult.success) {
      createdIds.orderId = orderResult.order_number;
      const batchId = orderResult.order.batch_id || orderResult.order.id;
      createdIds.batchId = batchId;

      // PHASE 2: Create Optimization from Order
      console.log('\n=== PHASE 2: Optimization from Order ===');
      const optResult = await batchLifecycle.createOptimizationFromOrder(orderResult.order_number);
      step('Optimization created from order', optResult.success, optResult.batch_id);

      // PHASE 3: Use Recommended Recipe to Create Batch
      if (optResult.success) {
        console.log('\n=== PHASE 3: Batch Creation from Optimization ===');
        const dossier = await getBatchDossier(createdIds.batchId);
        const useResult = await batchLifecycle.useRecommendedRecipe(createdIds.batchId);
        step('Batch created from recommended recipe', useResult.success, useResult.batch_id);

        // PHASE 4: Record Actual Recipe and Process
        console.log('\n=== PHASE 4: Record Actual Production Data ===');
        const actualResult = await batchLifecycle.recordActualRecipe(
          createdIds.batchId,
          [{ dye_name: 'Reactive Blue', actual_concentration: 2.55, actual_quantity_kg: 2.55 }],
          [{ chemical_name: 'Salt', actual_dosage: 20 }],
          { temperature: 82, time_minutes: 65, liquor_ratio: 10, ph: 11 }
        );
        step('Actual recipe and process recorded', actualResult.success, actualResult.batch_id);

        // PHASE 5: Record Measured Shade (auto ΔE)
        console.log('\n=== PHASE 5: Shade Measurement ===');
        const shadeResult = await batchLifecycle.recordShadeResult(
          createdIds.batchId,
          45.5, 10.2, -20.3,
          { instrument: 'Spectrophotometer Datacolor 800', operator: 'Test Operator' }
        );
        const expectedDE = shadeResult.target_lab ? deltaE76(
          shadeResult.target_lab.L, shadeResult.target_lab.a, shadeResult.target_lab.b,
          45.5, 10.2, -20.3
        ) : null;
        step('Shade result recorded with auto ΔE', shadeResult.success && shadeResult.delta_e_76 !== null,
          `ΔE76: ${shadeResult.delta_e_76}`);

        // PHASE 6: Calculate Batch Intelligence
        console.log('\n=== PHASE 6: Batch Intelligence ===');
        const intel = await batchLifecycle.calculateBatchIntelligence(createdIds.batchId);
        step('Batch intelligence calculated', intel.success, `Deviations: ${JSON.stringify(intel.deviations).slice(0, 100)}`);

        // PHASE 7: Wastewater Prediction
        console.log('\n=== PHASE 7: Wastewater Prediction ===');
        const wwResult = await batchLifecycle.createWastewaterPrediction(createdIds.batchId);
        step('Wastewater prediction created', wwResult.success, wwResult.prediction?.prediction_status);

        // PHASE 8: Record Wastewater Measurements
        console.log('\n=== PHASE 8: Wastewater Measurements ===');
        const wwMeasResult = await batchLifecycle.recordWastewaterMeasurement(
          createdIds.batchId,
          [{ parameter: 'pH', value: 8.5, unit: 'pH' }, { parameter: 'TDS', value: 350, unit: 'ppm' }],
          { data_source: 'manual_lab', quality: 'validated' }
        );
        step('Wastewater measurements recorded', wwMeasResult.success, `${wwMeasResult.measurements?.length || 0} measurements`);

        // PHASE 9: Expected vs Actual Comparison
        console.log('\n=== PHASE 9: Expected vs Actual ===');
        const comparison = await batchLifecycle.compareExpectedVsActual(createdIds.batchId);
        step('Comparison generated', comparison.success, comparison.status);

        // PHASE 10: ETP Recommendation
        console.log('\n=== PHASE 10: ETP Recommendation ===');
        const etp = await batchLifecycle.generateETPRecommendation(createdIds.batchId);
        step('ETP recommendation generated', etp.success, etp.recommendation_status || etp.recommendation?.substring(0, 50));

        // PHASE 11: Training Readiness
        console.log('\n=== PHASE 11: Training Readiness ===');
        const training = await batchLifecycle.evaluateTrainingReadiness(createdIds.batchId);
        step('Training readiness evaluated', training.success, `Eligible: ${training.eligibility}`);

        // PHASE 12: Generate Batch Report
        console.log('\n=== PHASE 12: Batch Report ===');
        const reportResult = await batchLifecycle.generateBatchReport(createdIds.batchId);
        step('Batch report generated', reportResult.success, reportResult.report_id);

        // PHASE 13: Verify all entities reference same batch_id
        console.log('\n=== PHASE 13: Relationship Verification ===');
        const { data: batch } = await supabase.from('dye_batches').select('*').eq('id', createdIds.batchId).single();
        step('Batch has batch_id', !!batch, batch?.batch_id);

        const { data: dyes } = await supabase.from('dye_batch_dyes').select('batch_id').eq('batch_id', createdIds.batchId);
        step('Dyes reference batch_id', dyes && dyes.length > 0 && dyes.every(d => d.batch_id === createdIds.batchId), `${dyes?.length} dye rows`);

        const { data: chems } = await supabase.from('dye_batch_chemicals').select('batch_id').eq('batch_id', createdIds.batchId);
        step('Chemicals reference batch_id', chems && chems.length > 0 && chems.every(c => c.batch_id === createdIds.batchId), `${chems?.length} chemical rows`);

        const { data: process } = await supabase.from('dye_batch_process').select('batch_id').eq('batch_id', createdIds.batchId);
        step('Process references batch_id', process && process.length > 0 && process.every(p => p.batch_id === createdIds.batchId), `${process?.length} process rows`);

        const { data: target } = await supabase.from('dye_batch_target_shade').select('batch_id').eq('batch_id', createdIds.batchId).maybeSingle();
        step('Target shade references batch_id', !!target && target.batch_id === createdIds.batchId, target?.batch_id);

        const { data: shade } = await supabase.from('dye_batch_shade_results').select('batch_id').eq('batch_id', createdIds.batchId);
        step('Shade result references batch_id', shade && shade.length > 0 && shade.every(s => s.batch_id === createdIds.batchId), `${shade?.length} shade rows`);

        const { data: etpRec } = await supabase.from('etp_recommendations').select('batch_id').eq('batch_id', createdIds.batchId).maybeSingle();
        step('ETP recommendation references batch_id', !!etpRec && etpRec.batch_id === createdIds.batchId, etpRec?.batch_id);

        // PHASE 14: Verify lifecycle status progression
        console.log('\n=== PHASE 14: Lifecycle Verification ===');
        const updatedBatch = await supabase.from('dye_batches').select('lifecycle_status').eq('id', createdIds.batchId).single();
        step('Batch has lifecycle_status', !!updatedBatch.data?.lifecycle_status, updatedBatch.data?.lifecycle_status);

        // Verify state transition
        const transResult = await batchLifecycle.createBatchFromOptimization(createdIds.batchId);
        step('State transition works', transResult.success, transResult.lifecycle_status);
      }
    }

    // SUMMARY
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total: ${report.passed + report.failed}`);
    console.log(`Passed: ${report.passed}`);
    console.log(`Failed: ${report.failed}`);

    if (report.failed === 0) {
      console.log('\n✅ ALL CONNECTED WORKFLOW TESTS PASSED');
    } else {
      console.log('\n❌ SOME TESTS FAILED');
      report.steps.filter(s => !s.ok).forEach(s => console.log(`  - Failed: ${s.name}: ${s.detail}`));
    }

  } catch (err) {
    console.error('\nTest execution error:', err.message || err);
    step('Overall execution', false, err.message || err);
  } finally {
    await cleanup();
    console.log('\nCleanup complete.');
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
