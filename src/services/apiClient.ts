// Frontend API Client connecting to Express Backend
const API_BASE = '/api';

async function getJson(path: string) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success === false ? null : (json.data ?? json);
  } catch {
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

export async function fetchBatchIntelligence(batchId: string) {
  return getJson(`/dye-batches/${batchId}/intelligence`);
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
