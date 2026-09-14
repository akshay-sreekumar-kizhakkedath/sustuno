import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchProductionBatches, fetchBatchIntelligence } from '../services/apiClient'

export function ProductionPage() {
  const [prod, setProd] = useState<any>(null)
  const [selected, setSelected] = useState<string>('')
  const [intel, setIntel] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const p = await fetchProductionBatches()
      setProd(p); setLoading(false)
      if (p?.batches?.length) setSelected(p.batches[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!selected) return
    ;(async () => setIntel(await fetchBatchIntelligence(selected)))()
  }, [selected])

  return (
    <>
      <PageHeader
        subtitle="Live production batches from Supabase with planned-vs-actual intelligence."
        actions={<Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Refresh</Button>}
      />
      {loading && <p className="p-5 text-[13px] text-on-surface-variant">Loading production data…</p>}
      {!loading && (!prod || prod.total_batches === 0) && (
        <Card><CardHeader title="Batches" subtitle="Live database" icon="assignment" />
          <p className="p-5 text-[13px] text-on-surface-variant">No production batches currently recorded in database. Create a dyeing batch from the Dye Optimizer workflow to begin.</p>
        </Card>
      )}
      {!loading && prod && prod.total_batches > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title="Batches" subtitle={`${prod.total_batches} recorded`} icon="assignment" />
            <div className="max-h-96 overflow-auto p-3">
              {(prod.batches || []).map((b: any) => (
                <button key={b.id} type="button" onClick={() => setSelected(b.id)}
                  className={`mb-2 w-full rounded-lg border p-3 text-left text-[13px] transition ${selected === b.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-primary/40'}`}>
                  <span className="font-semibold">{b.batch_id || b.id}</span>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-on-surface-variant">{b.dye_class ?? '—'} · <Badge tone="gray">{b.status ?? 'draft'}</Badge></span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Batch Intelligence" subtitle={selected ? `Planned vs actual · ${selected}` : 'Select a batch'} icon="fact_check" />
            <div className="p-5 text-[13px]">
              {!intel && <p className="text-on-surface-variant">Select a batch to view deviations.</p>}
              {intel && (
                <div className="space-y-4">
                  <p><strong>Status:</strong> {intel.status} · <strong>Source:</strong> {intel.data_source}</p>
                  <div>
                    <h4 className="font-semibold">Deviations</h4>
                    {(intel.deviations?.recipe?.length ?? 0) + (intel.deviations?.process?.length ?? 0) === 0 && !intel.deviations?.shade
                      ? <p className="text-on-surface-variant">No deviations recorded (or actual values not yet entered).</p>
                      : <ul className="mt-1 list-disc pl-5 text-[12.5px]">
                          {[...(intel.deviations?.recipe ?? []), ...(intel.deviations?.process ?? [])].map((d: any, i: number) => (
                            <li key={i}>{d.type} {d.dye_name ?? d.chemical_name ?? d.parameter ?? ''}: planned {String(d.planned)} → actual {String(d.actual)} (Δ {String(d.deviation)})</li>
                          ))}
                          {intel.deviations?.shade && <li>Shade ΔE76 = {String(intel.deviations.shade.delta_e_76)}</li>}
                        </ul>}
                  </div>
                  <div>
                    <h4 className="font-semibold">Missing information</h4>
                    {(intel.missing_information ?? []).length === 0
                      ? <p className="text-on-surface-variant">None missing.</p>
                      : <ul className="mt-1 list-disc pl-5 text-[12.5px]">{intel.missing_information.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>}
                  </div>
                  {(intel.warnings ?? []).length > 0 && (
                    <div className="rounded-md bg-amber-50 p-3 text-[12px] text-amber-800">
                      {intel.warnings.map((w: string, i: number) => <p key={i}>{w}</p>)}
                    </div>
                  )}
                  <p className="text-[11.5px] text-on-surface-variant">No invented tolerance thresholds are applied. Deviations report raw planned-vs-actual differences only.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
