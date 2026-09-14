import { supabase } from '../lib/supabase'

export async function getReportTypes() {
  const { data } = await supabase.from('report_types').select('*').order('label')
  return data ?? []
}

export async function getFacilitySegments() {
  const { data } = await supabase.from('facility_segments').select('*').order('segment_name')
  return data ?? []
}

export async function getExportFormats() {
  const { data } = await supabase.from('export_formats').select('*').order('label')
  return data ?? []
}

export async function getRecentReports() {
  const { data } = await supabase.from('recent_reports').select('*').order('date', { ascending: false }).limit(20)
  return data ?? []
}

export async function getInsightsSummary() {
  const { data } = await supabase.from('insights_summary').select('*').order('recorded_at', { ascending: false }).limit(10)
  return data ?? []
}
