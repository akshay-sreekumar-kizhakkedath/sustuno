import { supabase } from '../lib/supabase'

export async function getEtpKpis() {
  const { data } = await supabase.from('etp_kpis').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getEtpDecision() {
  const { data } = await supabase.from('etp_decisions').select('*').order('created_at', { ascending: false }).limit(1)
  const decision = data?.[0]
  if (!decision) return null
  const { data: chips } = await supabase
    .from('etp_decision_chips')
    .select('*')
    .eq('decision_id', decision.id)
  return { ...decision, chips: chips ?? [] }
}

export async function getTreatmentStrategy() {
  const { data } = await supabase.from('treatment_strategy').select('*').order('updated_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function getChemicalDosing() {
  const { data } = await supabase.from('chemical_dosing').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getPhControl() {
  const { data } = await supabase.from('ph_control').select('*').order('recorded_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function getMachineDirectives() {
  const { data } = await supabase.from('machine_directives').select('*').order('issued_at', { ascending: false })
  return data ?? []
}

export async function getEtpFinancials() {
  const { data } = await supabase.from('etp_financials').select('*').order('date', { ascending: false }).limit(1)
  return data?.[0] ?? null
}
