import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { RingGauge } from '../components/ui/RingGauge'
import {
  etpKpis,
  etpDecision,
  treatmentStrategy,
  dosing,
  pHControl,
  directives,
  etpFinancials,
} from '../data/etp'

export function EtpDecisionSupportPage() {
  return (
    <>
      <PageHeader
        actions={
          <>
            <Button variant="secondary" icon="description">
              Generate Report
            </Button>
            <Button variant="ai" icon="task_alt">
              Apply Recommendation
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <RingGauge value={etpDecision.confidence} size={88} stroke={8} color="#712ae2" sublabel="AI" />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
                AI Confidence
              </p>
              <p className="mt-1 font-mono-data text-[22px] font-semibold leading-none text-on-surface">
                {etpDecision.confidence}%
              </p>
              <p className="mt-1 text-[11.5px] text-success">Model verified · updated 2m ago</p>
            </div>
          </div>
        </Card>
        {etpKpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={`${k.value} ${k.unit}`}
            icon={k.icon}
            accent={k.accent}
            sub={k.sub}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hero decision */}
        <Card accent="#10b981" className="lg:col-span-2">
          <div className="p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Decision Analysis
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-[20px] font-bold text-on-surface">Water Reuse Suitability</h3>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-success">
                    <Icon name="check_circle" filled className="text-[22px]" />
                  </span>
                  <div>
                    <p className="text-[16px] font-bold text-emerald-700">{etpDecision.verdict}</p>
                    <p className="text-[12px] text-on-surface-variant">{etpDecision.verdictSub}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {etpDecision.chips.map((c) => (
                  <div key={c.label} className="rounded-lg border border-slate-100 bg-surface-container-low px-4 py-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      {c.label}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 font-mono-data text-[16px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {c.value} {c.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Treatment strategy */}
              <div className="rounded-lg border border-slate-100 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  <Icon name="science" className="text-[15px] text-secondary" />
                  Treatment Strategy
                </p>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5">
                  <span className="text-[12px] text-on-surface-variant">Current Phase</span>
                  <span className="text-[13px] font-semibold text-on-surface">
                    {treatmentStrategy.phase}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-primary-fixed px-3.5 py-2.5">
                  <span className="text-[12px] text-primary-deep">AI Suggestion</span>
                  <span className="text-[13px] font-bold text-primary-deep">
                    {treatmentStrategy.suggestion}
                  </span>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed text-on-surface-variant">
                  {treatmentStrategy.note}
                </p>
              </div>

              {/* Chemical dosing */}
              <div className="rounded-lg border border-slate-100 p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  <Icon name="vaccines" className="text-[15px] text-primary" />
                  Chemical Dosing
                </p>
                <div className="mt-3 space-y-3">
                  {dosing.map((d) => (
                    <div key={d.label}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] text-on-surface-variant">{d.label}</span>
                        <span className="font-mono-data text-[13px] font-semibold text-on-surface">
                          {d.value}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-600">
                  <Icon name="warning" className="text-[15px]" />
                  Lime inventory low (48h remaining)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* pH control + financials */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="pH Control"
              subtitle={`Target: ${pHControl.target}`}
              icon="speed"
            />
            <div className="p-5">
              <div className="relative">
                <div
                  className="h-2.5 w-full rounded-full"
                  style={{
                    background:
                      'linear-gradient(to right, #f87171 0%, #fbbf24 30%, #4ade80 50%, #60a5fa 100%)',
                  }}
                />
                <div
                  className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-slate-800 shadow"
                  style={{ left: `${(pHControl.current / 14) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] font-medium text-on-surface-variant">
                <span>Acidic 1.0</span>
                <span className="font-mono-data font-semibold text-on-surface">
                  Current: {pHControl.current}
                </span>
                <span>Alkaline 14.0</span>
              </div>
              <div className="mt-4 rounded-lg bg-surface-container-low px-4 py-3">
                <p className="text-[12px] text-on-surface-variant">AI Target</p>
                <p className="mt-0.5 font-mono-data text-[16px] font-semibold text-primary">
                  {pHControl.aiTarget} · {pHControl.action}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Financial Analysis" icon="payments" />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
                <span className="text-[12.5px] text-on-surface-variant">Total Treatment Cost</span>
                <span className="font-mono-data text-[16px] font-semibold text-on-surface">
                  {etpFinancials.cost}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Chemical', value: etpFinancials.chemical },
                  { label: 'Energy', value: etpFinancials.energy },
                ].map((f) => (
                  <div key={f.label} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-[11px] text-on-surface-variant">{f.label} Spend</p>
                    <p className="mt-0.5 font-mono-data text-[15px] font-semibold text-on-surface">
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                <span className="text-[12.5px] font-semibold text-emerald-800">
                  Daily Savings Realized
                </span>
                <span className="flex items-center gap-1.5 font-mono-data text-[15px] font-bold text-emerald-700">
                  {etpFinancials.savings} <Badge tone="green">{etpFinancials.savingsPct}</Badge>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Machine directives */}
      <Card className="mt-6">
        <CardHeader
          title="Active Machine Directives"
          subtitle="Live control directives issued by the AI engine"
          icon="precision_manufacturing"
          actions={
            <button type="button" className="text-[12px] font-semibold text-primary">
              View Manual Override
            </button>
          }
        />
        <div className="divide-y divide-slate-50">
          {directives.map((d) => (
            <div key={d.machine} className="flex items-center gap-4 px-5 py-4">
              <span className="h-10 w-1 rounded-full bg-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-on-surface">{d.machine}</p>
                <p className="mt-0.5 text-[12.5px] text-on-surface-variant">{d.desc}</p>
              </div>
              <Badge tone={d.value === 'Operational' ? 'green' : 'blue'}>{d.value}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
