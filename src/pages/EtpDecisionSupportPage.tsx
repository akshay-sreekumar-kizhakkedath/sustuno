import { useEffect, useState } from 'react'
import { PageHeader, Button } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Icon } from '../components/ui/Icon'
import { fetchEtpRules, fetchBatchEtpRecommendation } from '../services/apiClient'
import { useBatch } from '../context/BatchContext'
import { BatchWorkflowStepper } from '../components/workflow/BatchWorkflowStepper'

export function EtpDecisionSupportPage() {
  const { activeBatchId, activeBatch, completeBatch, refreshActiveBatch } = useBatch()

  const [decision, setDecision] = useState<any>(null)
  const [rules, setRules] = useState<any>(null)
  const [ww, setWw] = useState<any>(null)
  const [autoLoading, setAutoLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [batchEtpLoaded, setBatchEtpLoaded] = useState(false)

  useEffect(() => { ;(async () => setRules(await fetchEtpRules()))() }, [])

  // Auto-load ETP recommendation from active batch when PRODUCTION_ACTIVE or ETP_REVIEW
  useEffect(() => {
    if (!activeBatchId) return
    if (activeBatch?.lifecycle_status !== 'PRODUCTION_ACTIVE' && activeBatch?.lifecycle_status !== 'ETP_REVIEW') return
    setAutoLoading(true)
    fetchBatchEtpRecommendation(activeBatchId)
      .then((res) => {
        if (res && res.success && res.data) {
          setDecision(res.data)
          setBatchEtpLoaded(true)
          if (activeBatch?.wastewater_prediction) {
            setWw(activeBatch.wastewater_prediction)
          }
        }
      })
      .catch(() => {})
      .finally(() => setAutoLoading(false))
  }, [activeBatchId, activeBatch?.lifecycle_status])

  const handleCompleteBatch = async () => {
    if (!activeBatchId) return
    setCompleting(true)
    try {
      await completeBatch(activeBatchId, {
        etp_recommendation_applied: decision?.recommendation || 'Advisory reviewed',
        completed_via: 'ETP Decision Support Page',
      })
      await refreshActiveBatch()
    } finally {
      setCompleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="ETP Decision Support"
        subtitle="Advisory decision support only — never automatic plant control, never regulatory certification."
        actions={
          <div className="flex items-center gap-2">
            {activeBatchId && (
              <Button variant="secondary" icon="auto_awesome" onClick={() => {
                setAutoLoading(true)
                fetchBatchEtpRecommendation(activeBatchId).then((res) => {
                  if (res && res.success && res.data) { setDecision(res.data); setBatchEtpLoaded(true) }
                }).finally(() => setAutoLoading(false))
              }} disabled={autoLoading}>
                {autoLoading ? 'Loading...' : 'Load Batch Recommendation'}
              </Button>
            )}
          </div>
        }
      />

      <BatchWorkflowStepper />

      {/* Auto-loaded batch advisory banner */}
      {activeBatchId && batchEtpLoaded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-[12.5px]">
          <div className="flex items-center gap-2.5">
            <Icon name="auto_awesome" className="text-[20px] text-emerald-700" />
            <div>
              <p className="font-bold text-emerald-900">
                ETP Recommendation auto-generated for batch <span className="font-mono-data">{activeBatchId}</span>
              </p>
              <p className="text-emerald-800">
                Inputs sourced from confirmed recipe, wastewater prediction, and IoT telemetry — no re-entry required.
              </p>
            </div>
          </div>
          {activeBatch?.lifecycle_status === 'ETP_REVIEW' && (
            <Button variant="primary" icon="check_circle" onClick={handleCompleteBatch} disabled={completing}>
              {completing ? 'Completing...' : 'Complete Batch & Archive'}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Inputs panel — auto-loaded from batch */}
        <Card className="lg:col-span-1">
          <CardHeader
            title={batchEtpLoaded ? 'Batch Inputs (Auto-loaded)' : 'Batch Inputs'}
            subtitle={batchEtpLoaded ? `From confirmed recipe · ${activeBatchId}` : 'Awaiting batch data...'}
            icon="science"
          />
          <div className="space-y-3 p-5 text-[13px]">
            {batchEtpLoaded && activeBatch ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-slate-50 p-3 text-[12px]">
                  <p><strong>Dye Class:</strong> {activeBatch.dye_class || 'Reactive'}</p>
                  <p><strong>Batch Status:</strong> {activeBatch.lifecycle_status}</p>
                  <p><strong>Recipe Confirmed:</strong> {activeBatch.confirmed_at ? new Date(activeBatch.confirmed_at).toLocaleString() : 'Yes'}</p>
                </div>
                {activeBatch.wastewater_prediction && (
                  <div className="rounded-lg bg-sky-50 p-3 text-[12px]">
                    <p className="font-semibold text-sky-900">Predicted Wastewater Profile</p>
                    {Object.entries(activeBatch.wastewater_prediction?.predicted_profile || {}).map(([k, v]: any) => (
                      <p key={k} className="text-sky-800"><span className="text-sky-600">{k}:</span> {v === null ? 'not_available' : String(v)}</p>
                    ))}
                    <p className="mt-1 text-[11px] text-sky-700">
                      COD/BOD/TDS are not_available until lab measurement. Volume and pH are arithmetic estimates only.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12.5px] text-on-surface-variant">Load batch data from the Production workflow to auto-populate inputs.</p>
            )}
          </div>
        </Card>

        {/* Result panel */}
        <Card className="lg:col-span-2">
          <CardHeader title="ETP Recommendation" subtitle={decision ? decision.recommendation_status : 'No evaluation yet'} icon="fact_check"
            badge={decision ? <Badge tone={decision.recommendation_status === 'advisory_generated' ? 'green' : 'amber'}>{decision.recommendation_status}</Badge> : undefined} />
          <div className="p-5 text-[13px]">
            {!decision && <p className="text-on-surface-variant">
              {activeBatchId
                ? 'Click "Load Batch Recommendation" to auto-generate ETP advisory using confirmed recipe and IoT telemetry.'
                : 'Select a batch in the Production workflow to begin.'}
            </p>}
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

                {/* Complete Batch */}
                {activeBatchId && activeBatch?.lifecycle_status === 'ETP_REVIEW' && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div>
                      <p className="font-semibold text-emerald-900">Ready to archive this batch?</p>
                      <p className="text-[12px] text-emerald-800">Completing stores all telemetry and recipe data in the ML training pool.</p>
                    </div>
                    <Button variant="primary" icon="model_training" onClick={handleCompleteBatch} disabled={completing}>
                      {completing ? 'Archiving...' : 'Complete & Archive for ML Training'}
                    </Button>
                  </div>
                )}
                {activeBatch?.lifecycle_status === 'BATCH_COMPLETED' && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[12.5px] text-emerald-900">
                    <Icon name="task_alt" className="text-emerald-600" />
                    <span>Batch <strong>{activeBatchId}</strong> is COMPLETED. All data archived for future model training.</span>
                  </div>
                )}
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
