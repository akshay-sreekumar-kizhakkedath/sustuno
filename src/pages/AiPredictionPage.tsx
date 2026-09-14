import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { fetchMlStatus, fetchMlDatasetReadiness } from '../services/apiClient'

export function AiPredictionPage() {
  const [ml, setMl] = useState<any>(null)
  const [ds, setDs] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    ;(async () => {
      const [m, d] = await Promise.all([fetchMlStatus(), fetchMlDatasetReadiness()])
      if (live) { setMl(m); setDs(d); setLoading(false) }
    })()
    return () => { live = false }
  }, [])

  const status = ml?.model_status ?? 'not_available'

  return (
    <>
      <PageHeader
        subtitle="Shade ML status and dataset readiness from live model endpoints. No fabricated accuracy."
        actions={<Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Refresh</Button>}
      />
      {loading && <p className="p-5 text-[13px] text-on-surface-variant">Loading model status…</p>}
      {!loading && (
        <>
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
