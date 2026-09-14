import { supabase } from '../lib/supabase'

export async function getPredictionKpis() {
  const { data } = await supabase.from('prediction_kpis').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getOptimizedRecipes() {
  const { data } = await supabase.from('optimized_recipes').select('*').order('created_at', { ascending: false })
  return data ?? []
}

export async function getImpactMetrics() {
  const { data } = await supabase.from('impact_metrics').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getControlCenter() {
  const { data } = await supabase.from('control_center').select('*').order('recorded_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function getPredictorForm() {
  const { data } = await supabase.from('predictor_form').select('*').order('updated_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}
