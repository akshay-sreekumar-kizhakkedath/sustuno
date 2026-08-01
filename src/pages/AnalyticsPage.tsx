import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { LineChart } from '../components/ui/LineChart'
import { RingGauge } from '../components/ui/RingGauge'
import {
  envMetrics,
  envTrendCards,
  waterUsageSeries,
  complianceBars,
  savingsPortfolio,
  modelAccuracy,
  analyticsFilters,
} from '../data/analytics'

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-on-surface-variant">{label}</span>
      <select className="h-9 w-full min-w-[150px] rounded-md border border-slate-200 bg-white px-2.5 text-[12.5px] text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

export function AnalyticsPage() {
  return (
    <>
      <PageHeader
        actions={
          <Button variant="ai" icon="auto_awesome">
            Generate Optimization
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-card">
        <FilterSelect label="Date Range" options={analyticsFilters.dateRanges} />
        <FilterSelect label="Machine" options={analyticsFilters.machines} />
        <FilterSelect label="Batch" options={analyticsFilters.batches} />
        <FilterSelect label="Fabric" options={analyticsFilters.fabrics} />
        <Button variant="secondary" icon="filter_list">
          More Filters
        </Button>
      </div>

      {/* Resource metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {envMetrics.map((m) => (
          <Card key={m.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  {m.label}
                </p>
                <p className="mt-1 font-mono-data text-[22px] font-semibold leading-none text-on-surface">
                  {m.value}
                </p>
                <p className="mt-1 text-[11.5px] text-on-surface-variant">{m.note}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${m.color}18`, color: m.color }}
              >
                <Icon name={m.icon} className="text-[21px]" />
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
            </div>
          </Card>
        ))}
      </div>

      {/* Water usage + compliance */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Daily Water Usage Intensity"
            subtitle="m³ per 1000m of fabric produced"
            icon="water_drop"
            badge={<Badge tone="green">8.2% REDUCTION VS LW</Badge>}
          />
          <div className="p-5">
            <LineChart
              series={waterUsageSeries.series}
              height={260}
              xLabels={waterUsageSeries.xLabels}
              yMin={0}
              yMax={260}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Cumulative Savings Portfolio" subtitle="AI Performance & ROI Impact" icon="savings" />
          <div className="flex flex-col items-center gap-5 p-6">
            <RingGauge value={savingsPortfolio.roi} color="#712ae2" sublabel="Target ROI" />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-lg bg-surface-container-low p-3.5 text-center">
                <p className="font-mono-data text-[17px] font-semibold text-success">
                  {savingsPortfolio.cost}
                </p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">Total Cost Savings</p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3.5 text-center">
                <p className="font-mono-data text-[17px] font-semibold text-primary">
                  {savingsPortfolio.pollutionTons} T
                </p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">Pollution Reduced</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance bars + model matrix */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Environmental Compliance Map"
            subtitle="Historical compliance % by month"
            icon="verified"
            badge={
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> COD
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-purple-500" /> BOD
                </span>
              </span>
            }
          />
          <div className="flex h-56 items-end gap-2 px-5 pb-4 pt-5">
            {complianceBars.map((b) => (
              <div key={b.month} className="group flex flex-1 flex-col items-center gap-1.5">
                <span className="font-mono-data text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                  {b.pct}%
                </span>
                <div
                  className="w-full rounded-t-sm bg-primary/80 transition-all duration-200 group-hover:bg-primary group-hover:scale-x-105"
                  style={{ height: `${b.pct}%` }}
                />
                <span className="text-[9.5px] font-medium text-on-surface-variant">{b.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Prediction Reliability Matrix" subtitle="AI model accuracy scores" icon="verified" />
          <div className="space-y-3 p-5">
            {modelAccuracy.map((m) => (
              <div key={m.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
                <span className="text-[12.5px] text-on-surface-variant">{m.label}</span>
                <span className="font-mono-data text-[15px] font-semibold text-on-surface">{m.value}</span>
              </div>
            ))}
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                <Icon name="verified" className="text-[16px]" />
                Trust Index
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-on-surface-variant">
                System acceptance rate is up 15% this month, indicating high operator trust in AI-led
                recommendations.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Environmental trend cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {envTrendCards.map((c) => (
          <Card key={c.label} hover className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {c.label}
              </p>
              <Badge tone={c.tone}>{c.chip}</Badge>
            </div>
            <p className="mt-2 font-mono-data text-[24px] font-semibold leading-none text-on-surface">
              {c.value}
            </p>
          </Card>
        ))}
      </div>
    </>
  )
}
