import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { LineChart } from '../components/ui/LineChart'
import { sensors as mockSensors, telemetry as mockTelemetry, tanks as mockTanks, gateway as mockGateway, iotAlerts as mockAlerts } from '../data/iot'
import { getTelemetry, getTankLevels, getGatewayStatus, getIotAlerts, subscribeTelemetry } from '../../services/sensorService'
import { supabase } from '../../lib/supabase'

const toneColor: Record<string, string> = {
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  blue: '#2563eb',
}

interface SensorData {
  label: string
  value: string
  sub: string
  icon: string
  tone: 'green' | 'orange' | 'red' | 'blue'
  badge: string
}

interface TankData {
  label: string
  pct: number
  color: string
}

interface GatewayData {
  uptime: string
  model: string
  wifi: string
  mqtt: string
  firmware: string
}

interface AlertData {
  tone: 'red' | 'orange' | 'blue'
  time: string
  title: string
  desc: string
}

interface TelemetryData {
  xLabels: string[]
  series: { name: string; color: string; area?: boolean; dashed?: boolean; data: number[] }[]
}

function buildSensorsFromLive(rows: any[]): SensorData[] {
  const latest: Record<string, any> = {}
  for (const r of rows) {
    if (!latest[r.sensor_id] || new Date(r.timestamp) > new Date(latest[r.sensor_id].timestamp)) {
      latest[r.sensor_id] = r
    }
  }
  const meta: Record<string, { icon: string; label: string; sub: string }> = {
    ph: { icon: 'water_drop', label: 'pH Value', sub: 'Neutral Range' },
    ec: { icon: 'electric_bolt', label: 'EC (Cond.)', sub: 'mS/cm' },
    turbidity: { icon: 'opacity', label: 'Turbidity', sub: 'NTU' },
    temperature: { icon: 'thermostat', label: 'Temperature', sub: '°C' },
    flow_rate: { icon: 'speed', label: 'Flow Rate', sub: 'm³/hr' },
  }
  return Object.entries(meta).map(([id, m]) => {
    const r = latest[id]
    const val = r ? String(r.value) : '--'
    const quality = r?.quality ?? 'normal'
    const tone = quality === 'critical' ? 'red' : quality === 'warning' ? 'orange' : 'green'
    const badge = quality === 'critical' ? 'Alert' : quality === 'warning' ? 'Attention' : 'Online'
    return { label: m.label, value: val, sub: m.sub, icon: m.icon, tone, badge }
  })
}

function buildTelemetryFromLive(rows: any[]): TelemetryData {
  const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const last14 = sorted.slice(-14)
  const xLabels = last14.map((r) => {
    const d = new Date(r.timestamp)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const groups: Record<string, number[]> = {}
  for (const r of last14) {
    const sid = r.sensor_id
    if (!groups[sid]) groups[sid] = []
    groups[sid].push(r.value)
  }
  const colors: Record<string, string> = { ph: '#004ac6', ec: '#712ae2', turbidity: '#ef4444', temperature: '#10b981', flow_rate: '#f59e0b' }
  const names: Record<string, string> = { ph: 'pH', ec: 'EC', turbidity: 'Turbidity', temperature: 'Temp', flow_rate: 'Flow' }
  const series = Object.entries(groups).map(([sid, data]) => ({
    name: names[sid] ?? sid,
    color: colors[sid] ?? '#666',
    area: sid === 'ph',
    dashed: sid !== 'ph',
    data,
  }))
  return { xLabels, series }
}

export function IotMonitoringPage() {
  const [monitoring, setMonitoring] = useState(false)
  const [sensors, setSensors] = useState<SensorData[]>(mockSensors)
  const [telemetry, setTelemetry] = useState<TelemetryData>(mockTelemetry)
  const [tanks, setTanks] = useState<TankData[]>(mockTanks)
  const [gateway, setGateway] = useState<GatewayData>(mockGateway)
  const [iotAlerts, setIotAlerts] = useState<AlertData[]>(mockAlerts)
  const [lastPacket, setLastPacket] = useState('14:22:18')
  const [systemStarted, setSystemStarted] = useState(false)
  const [systemStarting, setSystemStarting] = useState(false)
  const subRef = useRef<ReturnType<typeof subscribeTelemetry> | null>(null)

  const fetchLiveData = useCallback(async () => {
    try {
      const [sensorRows, telemetryRows, tankRows, gatewayRow, alertRows] = await Promise.all([
        getTelemetry(undefined, 200),
        getTelemetry(undefined, 50),
        getTankLevels(),
        getGatewayStatus(),
        getIotAlerts(10),
      ])

      if (sensorRows.length) setSensors(buildSensorsFromLive(sensorRows))
      if (telemetryRows.length) setTelemetry(buildTelemetryFromLive(telemetryRows))

      if (tankRows.length) {
        const colors = ['#2563eb', '#2563eb', '#f59e0b', '#10b981']
        setTanks(tankRows.slice(0, 4).map((t: any, i: number) => ({
          label: t.tank_name ?? `Tank ${i + 1}`,
          pct: t.percentage ?? 0,
          color: t.color ?? colors[i],
        })))
      }

      if (gatewayRow) {
        setGateway({
          uptime: gatewayRow.uptime ?? '--',
          model: gatewayRow.model ?? 'ESP32-S3 WROOM',
          wifi: gatewayRow.wifi_signal ?? '--',
          mqtt: gatewayRow.mqtt_status ?? '--',
          firmware: gatewayRow.firmware ?? '--',
        })
      }

      if (alertRows.length) {
        setIotAlerts(alertRows.slice(0, 4).map((a: any) => ({
          tone: a.tone ?? 'blue',
          time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '--',
          title: a.title ?? 'Alert',
          desc: a.description ?? '',
        })))
      }

      const now = new Date()
      setLastPacket(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`)
    } catch (err) {
      console.error('Failed to fetch live IoT data:', err)
    }
  }, [])

  const handleStartSystem = useCallback(async () => {
    setSystemStarting(true)
    try {
      if (!systemStarted) {
        await fetchLiveData()
        setSystemStarted(true)
        setMonitoring(true)
        subRef.current = subscribeTelemetry((payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = payload.new
            if (r) {
              const now = new Date()
              setLastPacket(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`)
            }
          }
        })
      } else {
        if (subRef.current) {
          supabase.removeChannel(subRef.current)
          subRef.current = null
        }
        setSystemStarted(false)
        setMonitoring(false)
        setSensors(mockSensors)
        setTelemetry(mockTelemetry)
        setTanks(mockTanks)
        setGateway(mockGateway)
        setIotAlerts(mockAlerts)
      }
    } finally {
      setSystemStarting(false)
    }
  }, [systemStarted, fetchLiveData])

  useEffect(() => {
    return () => {
      if (subRef.current) {
        supabase.removeChannel(subRef.current)
      }
    }
  }, [])

  return (
    <>
      <PageHeader
        actions={
          <>
            <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-[12px] font-semibold">
              {['1H', '6H', '12H', '24H'].map((r, i) => (
                <button
                  key={r}
                  type="button"
                  className={`rounded px-3 py-1 transition ${
                    i === 0 ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={systemStarted ? fetchLiveData : undefined}
            >
              Force Sync
            </Button>
          </>
        }
      />

      {/* IoT System Control Panel */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${systemStarted ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <Icon
                name={systemStarted ? 'power_settings_new' : 'power_off'}
                className={`text-[26px] ${systemStarted ? 'text-emerald-600' : 'text-slate-400'}`}
              />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-on-surface">IoT System Control</h3>
              <p className="text-[12.5px] text-on-surface-variant">
                {systemStarted
                  ? 'System active — ESP32 gateway streaming sensor data'
                  : 'System idle — Start to begin real-time monitoring'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium ${
              systemStarted
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${systemStarted ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {systemStarted ? 'RUNNING' : 'STOPPED'}
            </div>

            <Button
              variant={systemStarted ? 'ai' : 'primary'}
              icon={systemStarting ? 'hourglass_empty' : systemStarted ? 'stop_circle' : 'play_circle'}
              onClick={handleStartSystem}
              disabled={systemStarting}
              className={`min-w-[160px] justify-center ${systemStarted ? 'animate-pulse' : ''}`}
            >
              {systemStarting
                ? 'Initializing...'
                : systemStarted
                  ? 'Stop IoT System'
                  : 'Start IoT System'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Monitoring status bar */}
      {monitoring && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-semibold">Live Monitoring Active</span>
          <span className="text-emerald-600">·</span>
          <span>ESP32-S3 Gateway connected via MQTT (TLS)</span>
          <span className="ml-auto font-mono-data text-[11px]">Last packet: {lastPacket}</span>
        </div>
      )}

      {/* Sensor grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {sensors.map((s) => (
          <div
            key={s.label}
            className="glass-card rounded-lg border border-slate-100 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${toneColor[s.tone]}18`, color: toneColor[s.tone] }}
              >
                <Icon name={s.icon} className="text-[20px]" />
              </div>
              <Badge tone={s.tone} dot pulse={monitoring}>
                {s.badge}
              </Badge>
            </div>
            <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {s.label}
            </p>
            <p className="mt-0.5 font-mono-data text-[24px] font-semibold leading-none text-on-surface">
              {s.value}
            </p>
            <p className="mt-1.5 text-[11.5px] text-on-surface-variant">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Telemetry + tanks */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Process Telemetry Trends"
            subtitle={monitoring ? "Live data from ESP32-S3 sensors" : "Multi-sensor array · live inlet monitoring"}
            icon="monitoring"
            badge={
              <span className="flex items-center gap-3">
                {telemetry.series.map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                ))}
              </span>
            }
          />
          <div className="p-5">
            <LineChart
              series={telemetry.series}
              height={240}
              xLabels={telemetry.xLabels}
              yMin={0}
              yMax={12}
            />
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[11.5px] text-on-surface-variant">
                ESP32-S3 Gateway · MQTT (TLS) · 2s polling interval
              </span>
              <span className="font-mono-data text-[11.5px] text-outline">
                Last packet: {lastPacket}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Tank Inventory"
              icon="inventory_2"
              actions={
                <button type="button" className="text-[12px] font-semibold text-primary">
                  View Capacities
                </button>
              }
            />
            <div className="space-y-4 p-5">
              {tanks.map((t) => (
                <div key={t.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12.5px] text-on-surface-variant">{t.label}</span>
                    <span className="font-mono-data text-[14px] font-semibold text-on-surface">
                      {t.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Gateway Health"
              icon="developer_board"
              badge={<Badge tone="blue">UPTIME: {gateway.uptime}</Badge>}
            />
            <div className="grid grid-cols-2 gap-3 p-5">
              {[
                { icon: 'developer_board', label: 'Model', value: gateway.model },
                { icon: 'wifi', label: 'WiFi Signal', value: gateway.wifi },
                { icon: 'hub', label: 'MQTT State', value: gateway.mqtt },
                { icon: 'update', label: 'Firmware', value: gateway.firmware },
              ].map((g) => (
                <div key={g.label} className="rounded-lg bg-surface-container-low p-3">
                  <Icon name={g.icon} className="text-[18px] text-primary" />
                  <p className="mt-1.5 text-[11px] text-on-surface-variant">{g.label}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-on-surface">{g.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Alerts */}
      <Card className="mt-6">
        <CardHeader
          title="Recent Alerts"
          subtitle="Telemetry thresholds and diagnostics"
          icon="notification_important"
          actions={
            <button type="button" className="text-[12px] font-semibold text-primary">
              Clear All
            </button>
          }
        />
        <div className="grid grid-cols-1 divide-y divide-slate-50 md:grid-cols-2 md:divide-x md:divide-y-0">
          {iotAlerts.map((a) => (
            <div key={a.title} className="flex items-start gap-3 border-b border-slate-50 px-5 py-4 md:border-b-0">
              <span
                className="mt-1 h-8 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: toneColor[a.tone] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-on-surface">{a.title}</p>
                  <span className="shrink-0 font-mono-data text-[11px] text-outline">{a.time}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-on-surface-variant">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
