// Frontend API Client connecting to Express Backend
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function getJson(path: string) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      console.warn(`[api] ${path} returned ${res.status} ${res.statusText}`);
      return null;
    }
    const json = await res.json();
    if (json.success === false) {
      console.warn(`[api] ${path} returned success:false`, json.error);
      return null;
    }
    return json.data ?? json;
  } catch (e: any) {
    console.warn(`[api] ${path} network error:`, e?.message ?? e);
    return null;
  }
}

async function postJson(path: string, payload: any) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { success: false as const, error: json?.error ?? { message: 'Request failed' } };
    return json;
  } catch (e: any) {
    return { success: false as const, error: { message: e?.message ?? 'Request failed' } };
  }
}

export async function fetchOverviewKpis() {
  return getJson('/overview/kpis');
}

export async function fetchMlDatasetReadiness() {
  try {
    const res = await fetch(`${API_BASE}/ml/dye-dataset/readiness`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchMlStatus() {
  return getJson('/ml/status');
}

export async function fetchEtpDecision(payload: any) {
  const r = await postJson('/etp/recommend', payload);
  if (r && r.success) return r.data;
  return null;
}

export async function fetchEtpRules() {
  return getJson('/etp/rules');
}

export async function fetchProductionBatches() {
  return getJson('/production/batches');
}

export async function fetchProductionSummary() {
  return getJson('/production/summary');
}

export async function fetchAnalyticsSummary() {
  return getJson('/analytics/summary');
}

export async function fetchWastewaterPrediction(payload: any) {
  const r = await postJson('/wastewater/predict', payload);
  if (r && r.success) return r.data;
  return null;
}

export async function fetchBatchComparison(batchId: string) {
  return getJson(`/dye-batches/${batchId}/comparison`);
}

export async function generateReport(reportType: string, params?: any) {
  const r = await postJson('/reports/generate', { report_type: reportType, ...params });
  if (r && r.success) return r.data;
  return null;
}

export async function fetchReportsList() {
  return getJson('/reports/list');
}

export async function runDyeOptimization(payload: any) {
  return postJson('/optimization/dye-recipe', payload);
}

export async function fetchFabrics() {
  return getJson('/reference/fabrics');
}

export async function fetchFibers() {
  return getJson('/reference/fibers');
}

export async function fetchDyeClasses(fabricId?: string) {
  return getJson(`/reference/dye-classes${fabricId ? `?fabric_id=${encodeURIComponent(fabricId)}` : ''}`);
}

export async function fetchMachines() {
  return getJson('/reference/machines');
}

export async function fetchRecipeResources(recipeId: string) {
  return getJson(`/reference/recipe-resources?recipe_id=${encodeURIComponent(recipeId)}`);
}

export async function fetchProcessDefaults(recipeId: string) {
  return getJson(`/reference/process-defaults?recipe_id=${encodeURIComponent(recipeId)}`);
}

// ================= Unified Workflow APIs =================
export async function createProductionBatch(input: any) {
  return postJson('/production/batches', input);
}

export async function fetchBatchDossier(batchId: string) {
  return getJson(`/production/batches/${encodeURIComponent(batchId)}`);
}

export async function optimizeBatchRecipe(batchId: string, preferences?: any) {
  return postJson(`/optimization/batches/${encodeURIComponent(batchId)}/optimize`, preferences || {});
}

export async function confirmBatchRecipe(batchId: string, recipeData: any) {
  return postJson(`/optimization/batches/${encodeURIComponent(batchId)}/confirm`, recipeData);
}

export async function startBatchProduction(batchId: string, deviceId?: string) {
  return postJson(`/production/batches/${encodeURIComponent(batchId)}/start-production`, { device_id: deviceId });
}

export async function completeBatchProduction(batchId: string, outcomeData?: any) {
  return postJson(`/production/batches/${encodeURIComponent(batchId)}/complete`, outcomeData || {});
}

export async function fetchBatchWastewater(batchId: string) {
  return getJson(`/wastewater/batches/${encodeURIComponent(batchId)}`);
}

export async function fetchActiveIotSession() {
  return getJson('/iot/active-session');
}

export async function fetchBatchIotReadings(batchId: string, limit = 50) {
  return getJson(`/batches/${encodeURIComponent(batchId)}/iot-readings?limit=${limit}`);
}

export async function fetchUnifiedBatchComparison(batchId: string) {
  return getJson(`/batches/${encodeURIComponent(batchId)}/comparison`);
}

export async function fetchBatchEtpRecommendation(batchId: string) {
  return getJson(`/batches/${encodeURIComponent(batchId)}/etp-recommendation`);
}

// ================= Connected Lifecycle APIs =================
export async function createProductionOrder(input: any) {
  return postJson('/lifecycle/production-order', input);
}

export async function fetchProductionOrders() {
  return getJson('/lifecycle/production-orders');
}

export async function optimizeFromOrder(orderId: string, preferences?: any) {
  return postJson(`/lifecycle/production-order/${encodeURIComponent(orderId)}/optimize`, preferences || {});
}

export async function useRecommendedRecipe(batchId: string, recipe?: any) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/use-recipe`, recipe ? { recipe } : {});
}

export async function recordActualRecipe(batchId: string, actualDyes: any[], actualChemicals: any[], actualProcess: any) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/actual-recipe`, { actual_dyes: actualDyes, actual_chemicals: actualChemicals, actual_process: actualProcess });
}

export async function recordShadeResult(batchId: string, L: number, a: number, b: number, metadata?: any) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/shade`, { measured_L: L, measured_a: a, measured_b: b, metadata });
}

export async function fetchBatchIntelligence(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/intelligence`);
}

export async function createWastewaterPrediction(batchId: string) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/wastewater-predict`, {});
}

export async function recordWastewaterMeasurement(batchId: string, measurements: any[], metadata?: any) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/wastewater-measurement`, { measurements, metadata });
}

export async function fetchWastewaterComparison(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/comparison`);
}

export async function generateETPFromBatch(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/etp`);
}

export async function evaluateTrainingReadiness(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/training-readiness`);
}

export async function generateBatchReportFromAPI(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/report`);
}

export async function fetchBatchWorkspace(batchId: string) {
  return getJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/workspace`);
}

export async function transitionBatchState(batchId: string, toStatus: string, trigger?: string, notes?: string) {
  return postJson(`/lifecycle/batch/${encodeURIComponent(batchId)}/state-transition`, { to_status: toStatus, trigger, notes });
}

export async function fetchProductionOrder(orderId: string) {
  return getJson(`/lifecycle/production-orders/${encodeURIComponent(orderId)}`);
}

