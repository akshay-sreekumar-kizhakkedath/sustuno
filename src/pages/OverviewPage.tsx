import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchOverviewKpis, fetchAnalyticsSummary, fetchProductionBatches, fetchMlStatus } from '../services/apiClient'

function Empty({ msg }: { msg: string }) {
  return <p className="p-5 text-[13px] text-on-surface-variant">{msg}</p>
}

export function OverviewPage() {
  const [kpis, setKpis] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [prod, setProd] = useState<any>(null)
  const [ml, setMl] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [k, a, p, m] = await Promise.all([
        fetchOverviewKpis(), fetchAnalyticsSummary(), fetchProductionBatches(), fetchMlStatus(),
      ])
      if (live) { setKpis(k); setAnalytics(a); setProd(p); setMl(m); setLoading(false) }
    })()
    return () => { live = false }
  }, [])

  const totalBatches = kpis?.total_batches ?? prod?.total_batches ?? null
  const optRequests = kpis?.optimization_requests ?? analytics?.total_optimizations ?? null
  const modelStatus = kpis?.model_status ?? ml?.model_status ?? 'not_available'

  return (
    <>
      <PageHeader
        subtitle="Live decision-support status from backend and Supabase. Empty states are shown honestly when no data exists."
        actions={
          <>
            <Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="ai" icon="auto_fix_high" onClick={() => (window.location.pathname = '/dye-optimizer')}>Open Dye Optimizer</Button>
          </>
        }
      />
      {loading && <Empty msg="Loading live status…" />}

      {!loading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Batches" value={totalBatches ?? 'No data'} icon="assignment" sub={totalBatches === 0 || totalBatches == null ? 'No production batches recorded yet.' : 'Live count from database.'} />
            <StatCard label="Optimization Requests" value={optRequests ?? 'No data'} icon="science" sub={optRequests === 0 || optRequests == null ? 'No historical optimization records available.' : 'Live count from database.'} />
            <StatCard label="Shade ML Model" value={modelStatus} icon="online_prediction" badge={<Badge tone={modelStatus === 'available' ? 'green' : modelStatus === 'demo_synthetic' ? 'purple' : 'amber'}>{modelStatus === 'available' ? 'AVAILABLE' : modelStatus === 'demo_synthetic' ? 'DEMO (SYNTHETIC)' : 'NOT AVAILABLE'}</Badge>} sub="Supervised training requires validated measured dyeing data." />
            <StatCard label="Training-Ready Batches" value={kpis?.training_ready ? 'Yes' : 'No data'} icon="verified" sub="0 real supervised samples currently." />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Production Overview" subtitle="Live batches from Supabase" icon="monitoring" />
              {!prod || prod.total_batches === 0 ? (
                <Empty msg="No production batches currently recorded in database." />
              ) : (
                <div className="max-h-64 overflow-auto p-5 text-[13px]">
                  {(prod.batches || []).slice(0, 10).map((b: any) => (
                    <div key={b.id} className="flex justify-between border-b border-slate-50 py-2">
                      <span className="font-medium">{b.batch_id || b.id}</span>
                      <span className="text-on-surface-variant">{b.dye_class ?? '—'} · {b.status ?? 'draft'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Model & Dataset Status" subtitle="Honest readiness, no fabricated metrics" icon="verified" />
              <div className="space-y-2 p-5 text-[13px]">
                <p><strong>Model status:</strong> {modelStatus}</p>
                <p><strong>Dataset:</strong> {analytics ? `${analytics.supervised_samples_count ?? 0} supervised samples (threshold ${analytics.target_sample_threshold ?? 200})` : 'No supervised dyeing batches available.'}</p>
                <p className="text-on-surface-variant">Shade prediction model is not yet trained. Predictions are unavailable until validated real dyeing batches with measured Lab* are recorded.</p>
                <p className="text-[11.5px] text-on-surface-variant">KB rules: 13 domain rules, all human_validation_status = pending (advisory/prototype mode).</p>
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Platform Scope" subtitle="Current phase boundaries" icon="info" />
            <div className="grid gap-3 p-5 text-[12.5px] sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><strong>IoT / sensors</strong><br />OUT OF SCOPE FOR CURRENT PHASE. Mock telemetry is not used for decisions.</div>
              <div className="rounded-lg bg-slate-50 p-3"><strong>Treated-water reuse loop</strong><br />FUTURE SCOPE. Not implemented.</div>
              <div className="rounded-lg bg-slate-50 p-3"><strong>ETP control</strong><br />Advisory decision support only — never automatic plant control.</div>
            </div>
          </Card>
        </>
      )}
    </>
  )
}
