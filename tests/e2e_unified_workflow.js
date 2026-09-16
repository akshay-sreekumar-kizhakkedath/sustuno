// SUSTUNO UNIFIED END-TO-END WORKFLOW TEST
// Validates the full lifecycle: Create Batch → Optimization → Confirm Recipe →
// Wastewater Prediction → IoT Telemetry → Comparison → ETP Recommendation → Complete Batch
// Run: node tests/e2e_unified_workflow.js

const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: 'D:/SUSTUNO/dash board/backend/.env' });
const BACKEND_DIR = 'D:/SUSTUNO/dash board/backend';
const FRONTEND_DIR = 'D:/SUSTUNO/dash board/aquatex-ai-react';
const BACKEND_PORT = Number(process.env.PORT || 5000);
const FRONTEND_PORT = 5173;
const B = `http://localhost:${FRONTEND_PORT}`;
const SOLO = `http://localhost:${BACKEND_PORT}`;

const report = { generatedAt: new Date().toISOString(), steps: [], passed: 0, failed: 0 };
let backend, frontend, browser, page;

function step(name, ok, detail) {
  if (ok) { report.passed++; console.log(`  [PASS] ${name}`); }
  else { report.failed++; console.log(`  [FAIL] ${name}: ${detail || ''}`); }
  report.steps.push({ name, ok, detail });
}

function phase(name, checks) {
  console.log(`\n=== ${name} ===`);
  for (const c of checks) { if (!c.ok) report.failed++; }
  report.phases = report.phases || [];
  report.phases.push({ name, total: checks.length, failed: checks.filter(c => !c.ok).length, checks });
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let b = '';
      res.on('data', d => b += d.toString());
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
  });
}

function httpPost(url, data) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const req = http.request({ hostname: parsed.hostname, port: parsed.port, path: parsed.pathname, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let b = '';
      res.on('data', d => b += d.toString());
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.write(JSON.stringify(data));
    req.end();
  });
}

function waitFor(fn, ms, label) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const iv = setInterval(async () => {
      try { if (await fn()) { clearInterval(iv); resolve(); return; } } catch {}
      if (Date.now() - t0 > ms) { clearInterval(iv); reject(new Error('timeout: ' + label)); }
    }, 200);
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['server.js'], { cwd: BACKEND_DIR, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => err += d.toString());
    waitFor(() => httpGet(`${SOLO}/api/health`).then(r => r.status === 200), 25000, 'backend boot')
      .then(() => resolve(p))
      .catch(() => { p.kill(); reject(new Error('backend failed: ' + err.slice(-800))); });
  });
}

function startFrontend() {
  return new Promise((resolve, reject) => {
    const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
    const p = spawn(process.execPath, [viteBin, '--port', String(FRONTEND_PORT), '--strictPort'], { cwd: FRONTEND_DIR, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => err += d.toString());
    waitFor(() => httpGet(`${B}/`).then(r => r.status === 200), 60000, 'frontend boot')
      .then(() => resolve(p))
      .catch(() => { p.kill(); reject(new Error('frontend failed: ' + err.slice(-800))); });
  });
}

async function main() {
  report.phases = [];
  console.log('[unified-workflow] booting real backend + real Vite ...');
  backend = await startBackend();
  frontend = await startFrontend();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();

  // Navigate to frontend
  await page.goto(B);
  await page.waitForTimeout(2000);

  // Phase 1: Create Batch via API
  console.log('\n=== Phase 1: Create Batch ===');
  const batchRes = await httpPost(`${SOLO}/api/production/batches`, {
    material: {
      fabric_id: 'COTTON-001',
      fabric_type: 'Cotton Single Jersey',
      fiber_composition: [{ fiber: 'Cotton', percentage: 100 }],
      weight_kg: 200,
      gsm: 180,
    },
    target_shade: { L: 45, a: 10, b: -20, color_space: 'CIELAB', shade_depth: 'Medium' },
    dye_class: 'Reactive',
    machine: { machine_id: 'JET-01' },
  });
  const batchData = JSON.parse(batchRes.body);
  const batchId = batchData?.data?.batch_id || batchData?.data?.id;
  step('Create batch returns success', batchRes.status === 201 && batchId !== null, `batch_id: ${batchId}`);
  step('Batch ID matches BATCH-YYYY-NNNN pattern', /BATCH-\d{4}-\d{4}/.test(batchId || ''), `Got: ${batchId}`);

  // Phase 2: Retrieve full batch dossier
  console.log('\n=== Phase 2: Retrieve Batch Dossier ===');
  const dossierRes = await httpGet(`${SOLO}/api/production/batches/${encodeURIComponent(batchId)}`);
  const dossier = JSON.parse(dossierRes.body);
  step('Batch dossier retrieved', dossierRes.status === 200 && dossier?.data?.batch_id === batchId, `status: ${dossierRes.status}`);
  step('Batch has lifecycle_status field', dossier?.data?.lifecycle_status !== undefined, `lifecycle_status: ${dossier?.data?.lifecycle_status}`);

  // Phase 3: Run Optimization
  console.log('\n=== Phase 3: Optimize Batch ===');
  const optRes = await httpPost(`${SOLO}/api/optimization/batches/${encodeURIComponent(batchId)}/optimize`, {
    preferences: { shade_weight: 1.0, cost_weight: 0.5, water_weight: 0.0 },
  });
  const optData = JSON.parse(optRes.body);
  step('Optimization completes', optRes.status === 200 && optData?.success === true, `status: ${optRes.status}`);

  // Phase 4: Confirm Recipe
  console.log('\n=== Phase 4: Confirm Recipe ===');
  const confirmRes = await httpPost(`${SOLO}/api/optimization/batches/${encodeURIComponent(batchId)}/confirm`, {
    recipe: optData?.data?.optimization?.recommended_recipe || {},
    operator: 'Test Operator',
  });
  const confirmData = JSON.parse(confirmRes.body);
  step('Recipe confirmation succeeds', confirmRes.status === 200 && confirmData?.success === true, `lifecycle: ${confirmData?.data?.lifecycle_status}`);

  // Phase 5: Generate Wastewater Prediction
  console.log('\n=== Phase 5: Generate Wastewater Prediction ===');
  const wwRes = await httpPost(`${SOLO}/api/wastewater/batches/${encodeURIComponent(batchId)}/generate`, {});
  const wwData = JSON.parse(wwRes.body);
  step('Wastewater prediction generated', wwRes.status === 200 && wwData?.success === true, `status: ${wwData?.data?.prediction_status}`);

  // Phase 6: IoT Telemetry Ingestion
  console.log('\n=== Phase 6: Submit IoT Readings ===');
  const iotRes = await httpPost(`${SOLO}/api/iot/readings`, {
    device_id: 'SUSTUNO-ESP32-001',
    plant_id: 'PLANT-001',
    batch_id: batchId,
    timestamp: new Date().toISOString(),
    sensors: {
      ph: { value: 7.2, raw_voltage: 2.5, probe_voltage: 8.0, status: 'OK' },
      tds_ppm: { value: 150, raw_voltage: 0.5, status: 'OK' },
      turbidity_ntu: { value: 5, raw_voltage: 0.3, status: 'OK' },
      temperature_c: { value: 65, raw_voltage: 0.8, status: 'OK' },
      flow_lpm: { value: 2.5, total_liters: 10, status: 'OK' },
    },
    device_info: { firmware: '1.0.0', uptime_s: 3600, wifi_rssi_dbm: -45, free_heap_bytes: 200000, health: 'ALL_OK' },
  });
  step('IoT readings submitted', iotRes.status === 200, `status: ${iotRes.status}`);

  // Phase 7: Verify Comparison
  console.log('\n=== Phase 7: Expected vs Actual Comparison ===');
  const compRes = await httpGet(`${SOLO}/api/batches/${encodeURIComponent(batchId)}/comparison`);
  const compData = JSON.parse(compRes.body);
  step('Comparison data retrieved', compRes.status === 200 && compData?.success === true, `status: ${compRes.status}`);

  // Phase 8: Retrieve ETP Recommendation
  console.log('\n=== Phase 8: ETP Recommendation ===');
  const etpRes = await httpGet(`${SOLO}/api/batches/${encodeURIComponent(batchId)}/etp-recommendation`);
  const etpData = JSON.parse(etpRes.body);
  step('ETP recommendation retrieved', etpRes.status === 200 && etpData?.success === true, `status: ${etpRes.status}`);

  // Phase 9: Complete Batch
  console.log('\n=== Phase 9: Complete Batch ===');
  const completeRes = await httpPost(`${SOLO}/api/production/batches/${encodeURIComponent(batchId)}/complete`, {
    notes: 'Batch completed through unified workflow test.',
  });
  const completeData = JSON.parse(completeRes.body);
  step('Batch completion succeeds', completeRes.status === 200 && completeData?.success === true, `lifecycle: ${completeData?.data?.lifecycle_status}`);

  // Phase 10: Verify active session endpoint
  console.log('\n=== Phase 10: Active Session Handshake ===');
  const sessionRes = await httpGet(`${SOLO}/api/iot/active-session`);
  const sessionData = JSON.parse(sessionRes.body);
  step('Active session endpoint responds', sessionRes.status === 200, `status: ${sessionRes.status}`);
  step('Active session has active_batch_id', sessionData?.active_batch_id !== undefined, `batch_id: ${sessionData?.active_batch_id}`);

  // Summary
  console.log('\n========================================');
  console.log('  UNIFIED WORKFLOW TEST RESULTS');
  console.log('========================================');
  console.log(`  Total steps: ${report.passed + report.failed}`);
  console.log(`  Passed: ${report.passed}`);
  console.log(`  Failed: ${report.failed}`);
  console.log('========================================');

  // Cleanup
  try { await browser.close(); } catch {}
  try { frontend?.kill(); } catch {}
  try { backend?.kill(); } catch {}
}

main().catch(err => {
  console.error('Test failed with error:', err);
  try { browser?.close(); } catch {}
  try { frontend?.kill(); } catch {}
  try { backend?.kill(); } catch {}
  process.exit(1);
});
