import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import {
  predictionKpis,
  optimizedRecipe,
  impactMetrics,
  controlCenter,
  predictorForm,
} from '../data/prediction'

export function AiPredictionPage() {
  return (
    <>
      <PageHeader
        actions={
          <Button variant="ai" icon="auto_awesome">
            Generate Optimization
          </Button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {predictionKpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={`${k.value} ${k.unit}`}
            icon="online_prediction"
            accent={k.accent}
            sub={k.sub}
            progress={k.progress}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* AI Optimizer */}
        <Card accent="#712ae2">
          <div className="bg-gradient-to-br from-[#712ae2] to-[#4c1d95] p-5 text-white">
            <div className="flex items-center gap-2">
              <Icon name="star" filled className="text-[20px] text-amber-300" />
              <h3 className="text-[15px] font-semibold">AI Optimizer</h3>
              <span className="ml-auto text-[11px] font-medium text-purple-200">
                Precision Dyeing Engine
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Fabric Type" select options={predictorForm.fabricTypes} dark />
              <Field label="Machine ID" select options={predictorForm.machines} dark />
              <Field label="Shade Code" defaultValue="HEX #2563EB" dark />
              <Field label="Target Recipe" defaultValue="R-442-B" dark />
              <button
                type="button"
                className="mt-1 w-full rounded-lg bg-white py-2.5 text-[13.5px] font-bold text-purple-700 transition hover:bg-purple-50 active:scale-[0.98]"
              >
                Generate AI Recipe
              </button>
            </div>
          </div>
          <div className="p-5">
            <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-on-surface-variant">
              <Icon name="info" className="mt-0.5 shrink-0 text-[16px] text-primary" />
              Predictions are based on real-time sensor data from ETP Inlet Pipes and historical
              shade data from 2023-24.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-container-low p-3">
              <div>
                <p className="text-[11px] text-on-surface-variant">Control Center</p>
                <div className="mt-1 flex gap-4">
                  <span className="flex items-center gap-1.5 font-mono-data text-[13px] font-semibold text-primary">
                    <Icon name="water_drop" className="text-[16px]" /> {controlCenter.waterSaved}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono-data text-[13px] font-semibold text-secondary">
                    <Icon name="science" className="text-[16px]" /> {controlCenter.chemicals}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition active:scale-95"
                aria-label="Simulate batch flow"
              >
                <Icon name="play_circle" className="text-[20px]" />
              </button>
            </div>
          </div>
        </Card>

        {/* Optimized recipe */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Optimized Recipe"
            subtitle={`Recommended adjustments for ${optimizedRecipe.batch}`}
            icon="auto_fix_high"
            badge={<Badge tone="purple">MODEL: 93%</Badge>}
            actions={
              <>
                <Button variant="secondary" icon="picture_as_pdf">
                  Export PDF
                </Button>
                <Button variant="primary" icon="check_circle">
                  Apply Recommendation
                </Button>
              </>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-5 py-3 font-semibold">Chemical Component</th>
                  <th className="px-5 py-3 font-semibold">Current (g/L)</th>
                  <th className="px-5 py-3 font-semibold">AI Recommended (g/L)</th>
                  <th className="px-5 py-3 font-semibold">Reduction</th>
                </tr>
              </thead>
              <tbody>
                {optimizedRecipe.rows.map((row) => (
                  <tr
                    key={row.component}
                    className="border-b border-slate-50 transition hover:bg-surface-container-low"
                  >
                    <td className="px-5 py-3.5 font-medium text-on-surface">{row.component}</td>
                    <td className="px-5 py-3.5 font-mono-data text-on-surface-variant">
                      {row.current}
                    </td>
                    <td className="px-5 py-3.5 font-mono-data font-semibold text-secondary">
                      {row.recommended}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone="green">{row.reduction}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Impact metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {impactMetrics.map((m) => (
          <Card key={m.label} hover className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-secondary">
                <Icon name="auto_awesome" className="text-[21px]" />
              </div>
              <p className="font-mono-data text-[22px] font-semibold leading-none text-on-surface">
                {m.value}
              </p>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-on-surface">{m.label}</p>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">{m.sub}</p>
          </Card>
        ))}
      </div>
    </>
  )
}

function Field({
  label,
  defaultValue,
  select,
  options,
  dark,
}: {
  label: string
  defaultValue?: string
  select?: boolean
  options?: string[]
  dark?: boolean
}) {
  const base = dark
    ? 'border-white/20 bg-white/10 text-white placeholder:text-purple-200'
    : 'border-slate-200 bg-white text-on-surface placeholder:text-outline'
  return (
    <label className="block">
      <span className={`mb-1 block text-[11px] font-semibold ${dark ? 'text-purple-100' : 'text-on-surface-variant'}`}>
        {label}
      </span>
      {select ? (
        <select className={`h-9 w-full rounded-md border px-2.5 text-[13px] outline-none ${base}`}>
          {options?.map((o) => (
            <option key={o} className="text-on-surface">
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          defaultValue={defaultValue}
          className={`h-9 w-full rounded-md border px-2.5 text-[13px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${base}`}
        />
      )}
    </label>
  )
}
