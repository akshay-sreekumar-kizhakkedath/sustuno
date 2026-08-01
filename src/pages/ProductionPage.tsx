import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, InfoRow } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { batch, fabric, dyeMachine, recipeAnalysis, resources, resourceTiles } from '../data/production'

export function ProductionPage() {
  return (
    <>
      <PageHeader
        actions={
          <>
            <Button variant="secondary" icon="history">
              Batch History
            </Button>
            <Button variant="primary" icon="upload_file">
              Recipe Upload
            </Button>
          </>
        }
      />

      {/* Batch / Fabric / Dye info cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card accent="#10b981">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="assignment" className="text-[20px]" />
                </div>
                <h3 className="text-[14.5px] font-semibold text-on-surface">Batch & Order</h3>
              </div>
              <Badge tone="green" dot pulse>
                LIVE
              </Badge>
            </div>
            <div className="mt-4 divide-y divide-slate-50">
              <InfoRow label="Batch ID" value={batch.id} />
              <InfoRow label="Order Number" value={batch.order} />
              <InfoRow label="Customer" value={batch.customer} />
              <InfoRow label="Shift" value={batch.shift} />
              <InfoRow label="Operator" value={batch.operator} />
            </div>
          </div>
        </Card>

        <Card accent="#712ae2">
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-secondary">
                <Icon name="layers" className="text-[20px]" />
              </div>
              <h3 className="text-[14.5px] font-semibold text-on-surface">Fabric Details</h3>
            </div>
            <div className="mt-4 divide-y divide-slate-50">
              <InfoRow label="Type" value={fabric.type} />
              <InfoRow label="Weight" value={fabric.weight} />
              <InfoRow label="GSM" value={fabric.gsm} />
              <InfoRow label="Lot Number" value={fabric.lot} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-success">
              <Icon name="check_circle" className="text-[16px]" />
              QC Verified
            </div>
          </div>
        </Card>

        <Card accent="#2563eb">
          <div className="p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                <Icon name="science" className="text-[20px]" />
              </div>
              <h3 className="text-[14.5px] font-semibold text-on-surface">Dye & Machine</h3>
            </div>
            <div className="mt-4 divide-y divide-slate-50">
              <InfoRow label="Dye Name" value={dyeMachine.dye} />
              <InfoRow label="Shade" value={dyeMachine.shade} />
              <InfoRow label="Machine" value={dyeMachine.machine} />
              <InfoRow label="Duration" value={dyeMachine.duration} />
              <InfoRow label="Liquor Ratio" value={dyeMachine.ratio} />
            </div>
          </div>
        </Card>
      </div>

      {/* Recipe analysis + resource utilization */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Chemical Recipe Analysis"
            subtitle="Planned vs. actual chemical usage for batch #BT-842"
            icon="fact_check"
            badge={<Badge tone="green">ADHERENCE: 98.4%</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Chemical Agent</th>
                  <th className="px-5 py-3 font-semibold">Planned (g/L)</th>
                  <th className="px-5 py-3 font-semibold">Actual (g/L)</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recipeAnalysis.map((row) => (
                  <tr
                    key={row.agent}
                    className="border-b border-slate-50 transition hover:bg-surface-container-low"
                  >
                    <td className="px-5 py-3 font-medium text-on-surface">{row.agent}</td>
                    <td className="px-5 py-3 font-mono-data text-on-surface-variant">
                      {row.planned}
                    </td>
                    <td className="px-5 py-3 font-mono-data font-semibold text-on-surface">
                      {row.actual}
                    </td>
                    <td className="px-5 py-3">
                      {row.ok ? (
                        <span className="flex items-center gap-1.5 text-success">
                          <Icon name="check_circle" className="text-[17px]" />
                          <span className="text-[12px] font-semibold">Compliant</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <Icon name="warning" className="text-[17px]" />
                          <span className="text-[12px] font-semibold">Attention</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Resource Utilization"
            subtitle="Batch consumption profile"
            icon="bolt"
          />
          <div className="space-y-4 p-5">
            {resources.map((r) => (
              <div key={r.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-on-surface-variant">{r.label}</span>
                  <span className="font-mono-data text-[15px] font-semibold text-on-surface">
                    {r.value}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {resourceTiles.map((t) => (
                <div key={t.label} className="rounded-lg bg-surface-container-low p-3.5">
                  <p className="font-mono-data text-[17px] font-semibold text-on-surface">
                    {t.value}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-on-surface-variant">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* AI engine + history strip */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-lg bg-inverse-surface p-6 text-inverse-on-surface lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-ai/20 blur-3xl" />
          <div className="relative">
            <Badge tone="purple">
              <Icon name="monitoring" className="text-[13px]" />
              AI Optimization Engine
            </Badge>
            <h3 className="mt-3 text-[19px] font-semibold">Predictive Load Balancing</h3>
            <p className="mt-1 max-w-md text-[13px] text-inverse-on-surface/70">
              Stable calibration across Jet-04 and supporting stations. Next calibration cycle in
              32 minutes.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <StatMini label="Stability" value="98.4%" tone="text-emerald-300" />
              <StatMini label="Load" value="74%" tone="text-blue-300" />
              <StatMini label="Drum Speed" value="120 RPM" tone="text-purple-300" />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader title="Batch History Search" icon="history" />
          <div className="space-y-3 p-5">
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3">
              <Icon name="search" className="text-[18px] text-outline" />
              <input
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-outline"
                placeholder="Filter by date, lot, or dye category..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" icon="description">
                PDF
              </Button>
              <Button variant="secondary" icon="table_chart">
                Excel / CSV
              </Button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-on-surface-variant">
              Export batch recipes, dye logs, and QC compliance sheets for audit archives.
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}

function StatMini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3.5 py-2.5">
      <p className={`font-mono-data text-[16px] font-semibold ${tone}`}>{value}</p>
      <p className="text-[11px] text-inverse-on-surface/60">{label}</p>
    </div>
  )
}
