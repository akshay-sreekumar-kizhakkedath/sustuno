import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchMlStatus, fetchMlDatasetReadiness, fetchWastewaterPrediction } from '../services/apiClient'

const CONTEXT_KEY = 'sustuno_prediction_context'

const PROFILE_META: Record<string, string> = {
  pH: 'pH',
  EC: 'EC (µS/cm)',
  TDS: 'TDS (ppm)',
  turbidity: 'Turbidity (NTU)',
  COD: 'COD (mg/L)',
  BOD: 'BOD (mg/L)',
  color: 'Color (Pt-Co)',
  flow: 'Flow (m³/h)',
}

function fmtCtx(v: any): string {
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

export function AiPredictionPage() {
  const [ml, setMl] = useState<any>(null)
  const [ds, setDs] = useState<any>(null)
  const [ctx, setCtx] = useState<any>(null)
  const [ww, setWw] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [wwBusy, setWwBusy] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [m, d] = await Promise.all([fetchMlStatus(), fetchMlDatasetReadiness()])
      if (live) { setMl(m); setDs(d); setLoading(false) }
    })()
    const raw = sessionStorage.getItem(CONTEXT_KEY)
    if (raw) {
      try { setCtx(JSON.parse(raw)) } catch { /* ignore malformed */ }
    }
    return () => { live = false }
  }, [])

  const loadPrediction = async (context: any) => {
    setWwBusy(true)
    setWw(null)
    try {
      const data = await fetchWastewaterPrediction(context)
      setWw(data)
    } finally {
      setWwBusy(false)
    }
  }

  useEffect(() => {
    if (ctx) loadPrediction(ctx)
  }, [ctx])

  const status = ml?.model_status ?? 'not_available'
  const recipe = ctx?.recipe || {}
  const proc = ctx?.process || {}
  const dyes = (recipe.dyes || []).map((d: any, i: number) => <p key={i}>• {d.dye_id} — {d.percentage_owf} % OWF ({d.quantity_kg} kg)</p>)
  const chems = (recipe.chemicals || []).map((c: any, i: number) => <p key={i}>• {c.chemical_id} — {c.dosage} {c.unit}</p>)
  const profiles = ww?.predicted_profile || {}
  const estimates = ww?.engineering_estimates || {}

  return (
    <>
      <PageHeader
        subtitle="Machine-learning status for shade prediction and wastewater characteristics predicted from the optimized recipe. No fabricated ML output."
        actions={<Button variant="secondary" icon="refresh" onClick={() => {
          sessionStorage.removeItem(CONTEXT_KEY)
          window.location.reload()
        }}>Start over</Button>}
      />
      {loading && <p className="p-5 text-[13px] text-on-surface-variant">Loading model status…</p>}
      {!loading && (
        <>
          {ctx ? (
            <Card className="mb-6">
              <CardHeader
                title="Wastewater Characteristics — Optimized Recipe"
                subtitle={`Carried from the Dye Optimizer · ${ctx.source === 'replay' ? 'replayed' : 'proceeded'}`}
                icon="water_drop"
                actions={<>{wwBusy ? <Badge tone="amber">PREDICTING…</Badge> : <Badge tone={ww?.prediction_status === 'available' ? 'green' : 'purple'}>{ww?.prediction_status === 'available' ? 'PREDICTION AVAILABLE' : 'ENGINEERING ESTIMATES'}</Badge>}</>}
              />
              <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-100 p-3">
                  <p className="text-[12px] font-semibold text-on-surface-variant">Recipe · Dyes</p>
                  {dyes}
                  <p className="mt-2 text-[12px] font-semibold text-on-surface-variant">Chemicals</p>
                  {chems}
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <StatCard label="Temperature" value={fmtCtx(proc.temperature ?? proc.temperature_c)} icon="thermostat" sub="°C" />
                    <StatCard label="Liquor Ratio" value={fmtCtx(proc.liquor_ratio)} icon="water_drop" sub="1:X" />
                    <StatCard label="Time" value={fmtCtx(proc.time_minutes)} icon="schedule" sub="min" />
                    <StatCard label="Bath pH" value={fmtCtx(proc.ph ?? proc.ph_expected ?? estimates.expected_bath_pH)} icon="science" sub="expected" />
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-100 p-3 text-[12.5px]">
                    <p><strong>Dye class:</strong> {fmtCtx(recipe.dye_class)} · <strong>Fabric:</strong> {fmtCtx(recipe.fabric_id)}</p>
                    <p className="mt-1"><strong>Fabric weight:</strong> {fmtCtx(ctx.batch?.fabric_weight_kg)} kg · <strong>GSM:</strong> {fmtCtx(ctx.batch?.gsm)}</p>
                    <p className="mt-1"><strong>Dye-bath volume:</strong> {estimates.dye_bath_volume_m3 != null ? `${estimates.dye_bath_volume_m3} m³` : 'N/A'} {estimates.calculation ? <span className="text-on-surface-variant">({estimates.calculation})</span> : null}</p>
                  </div>
                </div>
              </div>

              <CardHeader title="Predicted Wastewater Parameters" subtitle={ww?.prediction_status === 'available' ? 'Live model inference' : 'Engineering estimates only — no validated model yet'} icon="online_prediction" />
              <div className="p-5 pt-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {Object.entries(PROFILE_META).map(([k, label]) => {
                    const v = profiles[k]
                    return (
                      <div key={k} className="rounded-md bg-slate-50 p-2.5">
                        <p className="text-[11px] text-on-surface-variant">{label}</p>
                        <p className="font-mono-data text-[15px]">{v === null || v === undefined ? '—' : String(v)}</p>
                      </div>
                    )
                  })}
                </div>
                {ww?.prediction_status === 'not_available' && (
                  <p className="mt-3 rounded-md bg-amber-50 p-3 text-[12.5px] text-amber-800">
                    No validated wastewater prediction model exists yet — wastewater chemistry (COD/BOD/TDS/EC/turbidity/color) requires measured laboratory samples and stays honest:
                    no fabricated values are returned. Dye-bath arithmetic expectations (volume, recipe-set pH) are provided from the optimized recipe instead.
                    Use this recipe to record measured wastewater from the production batch; once measured samples accumulate, training readiness becomes eligible.
                  </p>
                )}
                {(ww?.warnings || []).length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-[12px] text-on-surface-variant">
                    {ww.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </div>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardHeader title="Wastewater Prediction" subtitle="From the optimized composition" icon="water_drop" />
              <div className="p-5 text-[13px] text-on-surface-variant">
                No optimized recipe handed over yet. Run the <strong>Dye Recipe Optimizer</strong>, then click <strong>Proceed to AI Prediction</strong> in the Wastewater Handoff section to carry the recommended dye and chemical composition here and predict wastewater characteristics from it.
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Model Status" value={status} icon="online_prediction" badge={<Badge tone={status === 'available' ? 'green' : status === 'demo_synthetic' ? 'purple' : 'amber'}>{status === 'demo_synthetic' ? 'DEMO (SYNTHETIC)' : status}</Badge>} />
            <StatCard label="Model Version" value={ml?.model_version ?? 'none'} icon="verified" />
            <StatCard label="Training Samples" value={ds?.valid ?? 0} icon="science" sub={`Threshold ${ds?.minimum_required ?? 200} · gap ${ds?.gap_to_minimum ?? 200}`} />
            <StatCard label="Dataset Phase" value={ds?.collection_phase ?? 'collecting'} icon="monitoring" sub={ds?.valid >= 200 ? 'Ready for training run' : 'Collecting validated batches'} />
          </div>

          <Card className="mt-6">
            <CardHeader title="Shade Prediction" subtitle="Model inference endpoint" icon="auto_awesome" />
            <div className="p-5 text-[13px]">
              {status === 'available' ? (
                <p>Model <strong>{ml?.model_version}</strong> is active. Use the Dye Optimizer to run predictions.</p>
              ) : status === 'demo_synthetic' ? (
                <>
                  <p className="font-semibold">Demo model active (synthetic data)</p>
                  <p className="mt-1 text-on-surface-variant">Model <strong>{ml?.model_version}</strong> was trained on 320 synthetic samples so you can exercise the full predict → optimize → rank loop. Predictions are illustrative only and must not be used for production dyeing. Production status remains not_available until validated real dyeing batches with measured Lab* are recorded.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Shade prediction model not available</p>
                  <p className="mt-1 text-on-surface-variant">No trained supervised model exists yet. Training requires validated real/laboratory dyeing batches with measured Lab*. Reference recipes and the Knowledge Base are not supervised training data. Current valid supervised samples: {ds?.valid ?? 0}.</p>
                  <p className="mt-2 text-[12px] text-on-surface-variant">Pipeline ready: batch → validation → dataset builder → training → evaluation → model version → inference → dye optimizer.</p>
                </>
              )}
              {ml?.metrics && <pre className="mt-3 overflow-auto rounded bg-slate-50 p-3 text-[12px]">{JSON.stringify(ml.metrics, null, 2)}</pre>}
            </div>
          </Card>
        </>
      )}
    </>
  )
}