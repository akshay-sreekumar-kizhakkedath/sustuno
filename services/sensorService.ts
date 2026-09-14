import { supabase } from '../lib/supabase'

export async function getSensors() {
  const { data } = await supabase.from('iot_sensors').select('*').eq('is_active', true).order('label')
  return data ?? []
}

export async function getTelemetry(sensorId?: string, limit = 50) {
  let query = supabase.from('sensor_telemetry').select('*').order('timestamp', { ascending: false })
  if (sensorId) query = query.eq('sensor_id', sensorId)
  const { data } = await query.limit(limit)
  return data ?? []
}

export async function getTankLevels() {
  const { data } = await supabase.from('tank_levels').select('*').order('recorded_at', { ascending: false })
  return data ?? []
}

export async function getGatewayStatus() {
  const { data } = await supabase.from('gateway_status').select('*').order('created_at', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function getIotAlerts(limit = 10) {
  const { data } = await supabase.from('iot_alerts').select('*').order('timestamp', { ascending: false }).limit(limit)
  return data ?? []
}

export function subscribeTelemetry(callback: (payload: any) => void) {
  return supabase
    .channel('sensor-telemetry')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sensor_telemetry' }, callback)
    .subscribe()
}
