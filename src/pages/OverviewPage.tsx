import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { RingGauge } from '../components/ui/RingGauge'
import { LineChart } from '../components/ui/LineChart'
import {
  waterKpis,
  waterTrend,
  chemOptimizationTable,
  aiInsights,
  predictedQuality,
  etpStrategies,
  workflowSteps,
  alerts,
  compliance,
  optimizerForm,
} from '../data/dashboard'

export function OverviewPage() {
  return (
    <>
      <PageHeader
        actions={
          <>
            <Button variant="secondary" icon="upload_file">
              Upload Recipe
            </Button>
            <Button variant="ai" icon="auto_fix_high">
              Generate AI Optimization
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {waterKpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={`${k.value} ${k.unit}`}
            icon={k.icon}
            accent={k.accent}
            sub={k.sub}
            badge={<Badge tone={k.badge.tone}>{k.badge.text}</Badge>}
          />
        ))}
      </div>

      {/* Trend + AI Optimizer */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={waterTrend.title}
            subtitle={waterTrend.subtitle}
            icon="monitoring"
            actions={
              <div className="flex rounded-md border border-slate-200 p-0.5 text-[12px] font-semibold">
                {['1H', '6H', '24H'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`rounded px-3 py-1 transition ${
                      r === '6H'
                        ? 'bg-primary text-white'
                        : 'text-on-surface-variant hover:bg-slate-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            }
          />
          <div className="p-5">
            <LineChart
              series={waterTrend.series}
              height={280}
              xLabels={waterTrend.xLabels}
              yMin={0}
              yMax={10}
            />
            <div className="mt-3 flex items-center gap-5 border-t border-slate-100 pt-3">
              {waterTrend.series.map((s) => (
                <span
                  key={s.name}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
              ))}
              <span className="ml-auto font-mono-data text-[11.5px] text-outline">
                Updated 08:42 AM · pH 7.14 · EC 2.31
              </span>
            </div>
          </div>
        </Card>

        <Card accent="#712ae2" className="flex flex-col">
          <div className="bg-gradient-to-br from-[#712ae2] to-[#4c1d95] p-5 text-white">
            <div className="flex items-center gap-2">
              <Icon name="bolt" filled className="text-[20px]" />
              <h3 className="text-[15px] font-semibold">AI Insights</h3>
              <span className="ml-auto text-[11px] font-medium text-purple-200">
                Monthly Projection
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {aiInsights.map((ins) => (
                <div
                  key={ins.label}
                  className="flex items-center justify-between rounded-lg bg-white/10 px-3.5 py-2.5 backdrop-blur"
                >
                  <div>
                    <p className="text-[11px] text-purple-100">{ins.label}</p>
                    <p className="font-mono-data text-[19px] font-semibold leading-tight">
                      {ins.value}
                    </p>
                  </div>
                  <Badge tone={ins.tone}>{ins.badge}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-5">
            <CardHeader
              title="AI Dye & Chemical Optimizer"
              subtitle="Input production metrics for predictive recipe calibration"
              badge={<Badge tone="purple">NEW</Badge>}
            />
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fabric Type" select options={optimizerForm.fabricTypes} />
                <Field label="Machine ID" select options={optimizerForm.machines} />
              </div>
              <Field label="Shade Name" defaultValue={optimizerForm.defaults.shade} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Batch Wt (Kg)" defaultValue={optimizerForm.defaults.weight} />
                <Field label="Depth (%)" defaultValue={optimizerForm.defaults.depth} />
                <Field label="Water Ratio" defaultValue={optimizerForm.defaults.ratio} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recipe table + predicted quality */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Chemical Optimization Recipe"
            subtitle="AI-recommended adjustments for current batch"
            icon="science"
            badge={<Badge tone="purple">AI ADJUSTED</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Chemical Component</th>
                  <th className="px-5 py-3 font-semibold">Current Standard</th>
                  <th className="px-5 py-3 font-semibold">AI Recommended</th>
                  <th className="px-5 py-3 font-semibold">Difference</th>
                  <th className="px-5 py-3 font-semibold">Impact</th>
                </tr>
              </thead>
              <tbody>
                {chemOptimizationTable.map((row) => (
                  <tr
                    key={row.component}
                    className="border-b border-slate-50 transition hover:bg-surface-container-low"
                  >
                    <td className="px-5 py-3 font-medium text-on-surface">{row.component}</td>
                    <td className="px-5 py-3 font-mono-data text-on-surface-variant">
                      {row.standard}
                    </td>
                    <td className="px-5 py-3 font-mono-data font-semibold text-primary">
                      {row.recommended}
                    </td>
                    <td className="px-5 py-3 font-mono-data text-success">{row.diff}</td>
                    <td className="px-5 py-3">
                      <Badge tone={row.impact.tone as 'green' | 'blue' | 'amber'}>
                        {row.impact.text}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="AI Predicted Wastewater Quality"
            subtitle={`Model Confidence: ${'93%'}`}
            icon="online_prediction"
            badge={<Badge tone="purple">93%</Badge>}
          />
          <div className="space-y-4 p-5">
            {predictedQuality.map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] text-on-surface-variant">{m.label}</span>
                  <span className="font-mono-data text-[16px] font-semibold text-on-surface">
                    {m.value} {m.unit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11.5px] text-on-surface-variant">
              Predictions based on real-time ETP inlet sensors and historical shade data (2023-24).
            </p>
          </div>
        </Card>
      </div>

      {/* ETP strategies + compliance + workflow */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="ETP Management Strategies"
            subtitle="AI-recommended treatment protocols"
            icon="fact_check"
          />
          <div className="space-y-3 p-5">
            {etpStrategies.map((s) => (
              <div
                key={s.title}
                className="flex items-start gap-4 rounded-lg border border-slate-100 p-4 transition hover:shadow-card"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name={s.icon} className="text-[21px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[14px] font-semibold text-on-surface">{s.title}</h4>
                    <Badge tone={s.tone}>{s.status}</Badge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-on-surface-variant">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-5 p-5">
              <RingGauge
                value={compliance.score}
                label={`${compliance.score}%`}
                sublabel={compliance.grade}
                color="#10b981"
              />
              <div>
                <h3 className="text-[14px] font-semibold text-on-surface">Compliance Score</h3>
                <p className="mt-1 text-[12.5px] text-on-surface-variant">{compliance.caption}</p>
                <div className="mt-2">
                  <Badge tone="green" dot>
                    Grade A
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Production Throughput
                </p>
                <p className="mt-1 font-mono-data text-[20px] font-semibold text-on-surface">
                  12 Batches
                </p>
                <p className="mt-1 text-[11.5px] text-success">On Schedule</p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  Total Water Consumed
                </p>
                <p className="mt-1 font-mono-data text-[20px] font-semibold text-on-surface">
                  248.6 m³
                </p>
                <p className="mt-1 text-[11.5px] text-on-surface-variant">
                  Efficiency: 8.2 L/kg Fabric
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent System Alerts"
              icon="notifications"
              actions={
                <button type="button" className="text-[12px] font-semibold text-primary">
                  Clear All
                </button>
              }
            />
            <div className="divide-y divide-slate-50">
              {alerts.map((a) => (
                <div key={a.title} className="flex items-start gap-3 px-5 py-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        a.tone === 'purple'
                          ? '#712ae2'
                          : a.tone === 'red'
                            ? '#ef4444'
                            : '#10b981',
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-on-surface">
                        {a.title}
                      </p>
                      <span className="shrink-0 text-[10.5px] text-outline">{a.time}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-on-surface-variant">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Workflow */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-4 p-5">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: step.color }}
                >
                  <Icon name={step.icon} className="text-[22px]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    Step {i + 1}
                  </p>
                  <p className="text-[13.5px] font-semibold text-on-surface">{step.label}</p>
                </div>
              </div>
              {i < workflowSteps.length - 1 && (
                <span className="material-symbols-outlined text-outline">arrow_forward</span>
              )}
            </div>
          ))}
          <p className="ml-auto flex max-w-[300px] items-start gap-2 text-[11.5px] leading-relaxed text-on-surface-variant">
            <Icon name="info" className="mt-0.5 text-[16px] shrink-0 text-primary" />
            The AI system loops between Sensing and Analytics every 60 seconds for real-time ETP
            dosing adjustments.
          </p>
        </div>
      </Card>
    </>
  )
}

function Field({
  label,
  defaultValue,
  select,
  options,
}: {
  label: string
  defaultValue?: string
  select?: boolean
  options?: string[]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">
        {label}
      </span>
      {select ? (
        <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
          {options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          defaultValue={defaultValue}
          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      )}
    </label>
  )
}
