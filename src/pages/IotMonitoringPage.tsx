import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { LineChart } from '../components/ui/LineChart'
import { sensors, telemetry, tanks, gateway, iotAlerts } from '../data/iot'

const toneColor: Record<string, string> = {
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
  blue: '#2563eb',
}

export function IotMonitoringPage() {
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
            <Button variant="ai" icon="refresh">
              Force Sync
            </Button>
          </>
        }
      />

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
              <Badge tone={s.tone} dot pulse>
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
            subtitle="Multi-sensor array · live inlet monitoring"
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
                Last packet: 14:22:18
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
