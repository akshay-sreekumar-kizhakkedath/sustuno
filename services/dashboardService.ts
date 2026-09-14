import { supabase } from '../lib/supabase'

export async function getWaterQualityKpis() {
  const { data } = await supabase.from('water_quality_kpis').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getWaterQualityTrends(parameter?: string, limit = 30) {
  let query = supabase.from('water_quality_trends').select('*').order('timestamp', { ascending: true })
  if (parameter) query = query.eq('parameter', parameter)
  const { data } = await query.limit(limit)
  return data ?? []
}

export async function getAiInsights() {
  const { data } = await supabase.from('ai_insights').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getPredictedQuality() {
  const { data } = await supabase.from('predicted_quality').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getEtpStrategies() {
  const { data } = await supabase.from('etp_strategies').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getWorkflowSteps() {
  const { data } = await supabase.from('workflow_steps').select('*').order('sort_order')
  return data ?? []
}

export async function getSystemAlerts() {
  const { data } = await supabase.from('system_alerts').select('*').order('timestamp', { ascending: false })
  return data ?? []
}

export async function getComplianceScore() {
  const { data } = await supabase.from('compliance_score').select('*').order('recorded_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}
