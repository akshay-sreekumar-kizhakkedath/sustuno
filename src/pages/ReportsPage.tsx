import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchReportsList, generateReport } from '../services/apiClient'

const REPORT_TYPES = ['dye_optimization', 'dyeing_batch', 'shade_comparison', 'recipe_comparison', 'wastewater_prediction', 'etp_decision', 'ml_dataset_readiness']

export function ReportsPage() {
  const [list, setList] = useState<any>(null)
  const [rtype, setRtype] = useState(REPORT_TYPES[0])
  const [targetId, setTargetId] = useState('')
  const [out, setOut] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => setList(await fetchReportsList())
  useEffect(() => { reload() }, [])

  const compile = async () => {
    setBusy(true); setOut(null)
    const r = await generateReport(rtype, targetId ? { batch_id: targetId } : {})
    setOut(r); setBusy(false)
  }

  return (
    <>
      <PageHeader subtitle="Auditable reports with timestamps, model versions, warnings and KB references." actions={<Button variant="secondary" icon="refresh" onClick={reload}>Refresh List</Button>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Report Generator" subtitle="Live /api/reports/generate" icon="analytics" />
          <div className="space-y-3 p-5 text-[13px]">
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Report type</span>
              <select value={rtype} onChange={e => setRtype(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 outline-none">
                {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Batch / optimization ID (optional)</span>
              <input value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="e.g. batch UUID" className="h-9 w-full rounded-md border border-slate-200 px-2.5 outline-none" />
            </label>
            <Button variant="primary" icon="auto_awesome" onClick={compile} disabled={busy}>{busy ? 'Compiling…' : 'Compile Report'}</Button>
            {out && (
              <div className="rounded-lg bg-slate-50 p-3 text-[12px]">
                <p className="font-semibold">{out.content?.title ?? out.report_type} · {out.report_id}</p>
                <p className="text-on-surface-variant">Generated {out.generated_at} · model {out.metadata?.model_status} · KB rules pending validation</p>
                <p className="mt-1">{out.content?.summary}</p>
                {(out.content?.warnings ?? []).map((w: string, i: number) => <p key={i} className="text-amber-700">⚠ {w}</p>)}
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Stored Reports" subtitle="Live /api/reports/list" icon="history" />
          {!list || list.total === 0
            ? <p className="p-5 text-[13px] text-on-surface-variant">{list?.note ?? 'No historical reports stored in database.'}</p>
            : <div className="max-h-80 overflow-auto p-5 text-[13px]">{(list.reports || []).map((r: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-slate-50 py-2"><span>{r.name ?? r.id}</span><Badge tone="gray">{r.status ?? 'ready'}</Badge></div>
              ))}</div>}
        </Card>
      </div>
    </>
  )
}
