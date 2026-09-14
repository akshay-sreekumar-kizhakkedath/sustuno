import { supabase } from '../lib/supabase'

export async function getEnvironmentMetrics() {
  const { data } = await supabase.from('environmental_metrics').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getWaterUsageSeries() {
  const { data } = await supabase.from('water_usage_series').select('*').order('week_label')
  return data ?? []
}

export async function getComplianceTrends() {
  const { data } = await supabase.from('compliance_trends').select('*').order('month')
  return data ?? []
}

export async function getSavingsPortfolio() {
  const { data } = await supabase.from('savings_portfolio').select('*').order('recorded_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function getModelAccuracy() {
  const { data } = await supabase.from('model_accuracy').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getAnalyticsFilters(filterType?: string) {
  let query = supabase.from('analytics_filters').select('*').order('updated_at', { ascending: false })
  if (filterType) query = query.eq('filter_type', filterType)
  const { data } = await query
  return data ?? []
}

export async function getPredictionKpis() {
  const { data } = await supabase.from('prediction_kpis').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getOptimizerForm() {
  const { data } = await supabase.from('optimizer_form').select('*').order('updated_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}
