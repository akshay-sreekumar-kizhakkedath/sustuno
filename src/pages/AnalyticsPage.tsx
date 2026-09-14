import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { fetchAnalyticsSummary } from '../services/apiClient'

export function AnalyticsPage() {
  const [a, setA] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => { setA(await fetchAnalyticsSummary()); setLoading(false) })()
  }, [])

  return (
    <>
      <PageHeader subtitle="Real aggregations from Supabase. Empty states shown when data is insufficient." actions={<Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Refresh</Button>} />
      {loading && <p className="p-5 text-[13px] text-on-surface-variant">Loading analytics…</p>}
      {!loading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Optimizations" value={a?.total_optimizations ?? 'No data'} icon="science" sub="Live count" />
            <StatCard label="Successful" value={a?.successful_optimizations ?? 'No data'} icon="check_circle" />
            <StatCard label="Supervised Samples" value={a?.supervised_samples_count ?? 0} icon="monitoring" sub={`Target ${a?.target_sample_threshold ?? 200}`} />
            <StatCard label="Model Performance" value={a?.model_performance?.status ?? 'not_available'} icon="verified" sub="Available only after first training run" />
          </div>
          <Card className="mt-6">
            <CardHeader title="Dataset Growth" subtitle="Honest readiness" icon="monitoring" />
            <div className="p-5 text-[13px]">
              {(!a || a.total_optimizations === 0) && <p className="text-on-surface-variant">{a?.empty_state_note ?? 'No historical optimization analytics available yet.'}</p>}
              {a && a.total_optimizations > 0 && <p>{a.total_optimizations} optimization(s) recorded · {a.successful_optimizations} successful. No fake historical charts are generated.</p>}
              <p className="mt-2 text-[12px] text-on-surface-variant">Best/worst recipe, dye/chemical usage and deviation analytics activate once real batch data accumulates.</p>
            </div>
          </Card>
        </>
      )}
    </>
  )
}
