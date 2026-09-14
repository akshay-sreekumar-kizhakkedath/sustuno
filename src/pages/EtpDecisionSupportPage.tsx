import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchEtpDecision, fetchEtpRules, fetchWastewaterPrediction } from '../services/apiClient'

export function EtpDecisionSupportPage() {
  const [dyeClass, setDyeClass] = useState('Reactive')
  const [cod, setCod] = useState('')
  const [ph, setPh] = useState('')
  const [jar, setJar] = useState('')
  const [decision, setDecision] = useState<any>(null)
  const [rules, setRules] = useState<any>(null)
  const [ww, setWw] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { ;(async () => setRules(await fetchEtpRules()))() }, [])

  const run = async () => {
    setBusy(true)
    const codNum = cod === '' ? null : Number(cod)
    const phNum = ph === '' ? null : Number(ph)
    const payload = {
      recipe: { dye_class: dyeClass, liquor_ratio: '1:10' },
      wastewater_profile: { COD: codNum, pH: phNum },
      plant_config: jar === '' ? {} : { jar_test_data: jar },
    }
    const [d, w] = await Promise.all([fetchEtpDecision(payload), fetchWastewaterPrediction(payload)])
    setDecision(d); setWw(w); setBusy(false)
  }

  return (
    <>
      <PageHeader
        subtitle="Advisory decision support only — never automatic plant control, never regulatory certification."
        actions={<Button variant="ai" icon="task_alt" onClick={run} disabled={busy}>{busy ? 'Evaluating…' : 'Get Recommendation'}</Button>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Inputs" subtitle="Recipe + wastewater + plant config" icon="science" />
          <div className="space-y-3 p-5 text-[13px]">
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Dye class</span>
              <select value={dyeClass} onChange={e => setDyeClass(e.target.value)} className="h-9 w-full rounded-md border px-2.5 outline-none bg-white">
                <option>Reactive</option><option>Disperse</option><option>Acid</option><option>Vat</option>
              </select>
            </label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Measured inlet COD (mg/L, optional)</span>
              <input value={cod} onChange={e => setCod(e.target.value)} placeholder="e.g. 620" className="h-9 w-full rounded-md border px-2.5 outline-none" />
            </label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Measured inlet pH (optional)</span>
              <input value={ph} onChange={e => setPh(e.target.value)} placeholder="e.g. 7.2" className="h-9 w-full rounded-md border px-2.5 outline-none" />
            </label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Jar-test reference (optional)</span>
              <input value={jar} onChange={e => setJar(e.target.value)} placeholder="Leave empty = insufficient dosing data" className="h-9 w-full rounded-md border px-2.5 outline-none" />
            </label>
            <p className="text-[11.5px] text-on-surface-variant">Exact dosing requires jar-test lab data plus verified inlet COD/pH. Otherwise dosing returns insufficient_data.</p>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recommendation" subtitle={decision ? decision.recommendation_status : 'No evaluation yet'} icon="fact_check"
            badge={decision ? <Badge tone={decision.recommendation_status === 'advisory_generated' ? 'green' : 'amber'}>{decision.recommendation_status}</Badge> : undefined} />
          <div className="p-5 text-[13px]">
            {!decision && <p className="text-on-surface-variant">Enter available data and click Get Recommendation. With no measured data the engine honestly returns insufficient_data.</p>}
            {decision && (
              <div className="space-y-3">
                <p><strong>What:</strong> {decision.recommendation}</p>
                <p><strong>Why:</strong> {decision.reason}</p>
                <div><strong>Evidence:</strong><ul className="list-disc pl-5">{(decision.evidence ?? []).map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>
                <p><strong>Dosing status:</strong> {decision.dosing?.status} {decision.dosing?.warning && <span className="text-amber-700">— {decision.dosing.warning}</span>}</p>
                {decision.dosing?.recommendation && <pre className="overflow-auto rounded bg-slate-50 p-3 text-[12px]">{JSON.stringify(decision.dosing.recommendation, null, 2)}</pre>}
                <div><strong>Strategies:</strong><ul className="list-disc pl-5">{(decision.strategies ?? []).map((s: any, i: number) => <li key={i}><strong>{s.stage}:</strong> {s.action}</li>)}</ul></div>
                <div><strong>Rules ({(decision.rules ?? []).length}):</strong> <span className="text-on-surface-variant">all human_validation_status = pending (advisory mode)</span></div>
                {(decision.warnings ?? []).map((w: string, i: number) => <p key={i} className="rounded bg-amber-50 p-2 text-[12px] text-amber-800">⚠ {w}</p>)}
                <p className="text-[11.5px] text-on-surface-variant">Assumptions: {(decision.assumptions ?? []).join(' ')} Limitations: {(decision.limitations ?? []).join(' ')}</p>
              </div>
            )}
            {ww && (
              <div className="mt-4 rounded-lg border p-3 text-[12px]">
                <strong>Wastewater profile prediction: {ww.prediction_status}</strong>
                <p className="text-on-surface-variant">{ww.prediction_status === 'not_available' ? 'Insufficient measured wastewater data for prediction.' : JSON.stringify(ww.predicted_profile)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Knowledge Rules" subtitle="Live /api/etp/rules · pending validation" icon="verified" />
        {!rules ? <p className="p-5 text-[13px] text-on-surface-variant">Loading rules…</p>
          : <p className="p-5 text-[13px]">{Array.isArray(rules) ? rules.length : (rules.total_rules ?? (rules.rules ?? []).length)} domain rules evaluated in advisory mode. No rule is production-approved.</p>}
      </Card>
    </>
  )
}
