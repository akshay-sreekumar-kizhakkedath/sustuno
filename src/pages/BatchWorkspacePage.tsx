// BatchWorkspacePage - Central batch lifecycle hub
// Displays full batch context across all workflow stages
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useBatch } from '../context/BatchContext';
import { BatchWorkflowStepper } from '../components/workflow/BatchWorkflowStepper';
import {
  fetchBatchWorkspace,
  recordShadeResult,
  recordWastewaterMeasurement,
  createWastewaterPrediction,
  generateETPFromBatch,
  generateBatchReportFromAPI,
  evaluateTrainingReadiness,
} from '../services/apiClient';


export function BatchWorkspacePage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { activeBatch, refreshBatches } = useBatch();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [shadeForm, setShadeForm] = useState({ L: '', a: '', b: '' });
  const [shadeLoading, setShadeLoading] = useState(false);
  const [etpResult, setEtpResult] = useState<any>(null);
  const [reportResult, setReportResult] = useState<any>(null);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  const loadWorkspace = useCallback(async () => {
    if (!batchId) return;
    try {
      const res = await fetchBatchWorkspace(batchId);
      if (res && res.success && res.data) {
        setWorkspace(res.data);
      }
    } catch (err) {
      console.warn('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const handleShadeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId || !shadeForm.L || !shadeForm.a || !shadeForm.b) return;
    setShadeLoading(true);
    try {
      const res = await recordShadeResult(batchId, Number(shadeForm.L), Number(shadeForm.a), Number(shadeForm.b));
      if (res && res.success) {
        setWorkspace(null);
        await loadWorkspace();
      }
    } finally {
      setShadeLoading(false);
    }
  };

  const handleETP = async () => {
    if (!batchId) return;
    try {
      const res = await generateETPFromBatch(batchId);
      if (res && res.success) {
        setEtpResult(res.data);
      }
    } catch (err) { console.warn('ETP error:', err); }
  };

  const handleReport = async () => {
    if (!batchId) return;
    try {
      const res = await generateBatchReportFromAPI(batchId);
      if (res && res.success) {
        setReportResult(res.data);
      }
    } catch (err) { console.warn('Report error:', err); }
  };

  const handleTrainingReadiness = async () => {
    if (!batchId) return;
    try {
      const res = await evaluateTrainingReadiness(batchId);
      if (res && res.success) {
        setTrainingResult(res.data);
      }
    } catch (err) { console.warn('Training readiness error:', err); }
  };

  const currentStatus = workspace?.batch?.lifecycle_status || activeBatch?.lifecycle_status || 'DRAFT';

  if (loading) {
    return <Card><p className="p-5 text-[13px] text-on-surface-variant">Loading batch workspace…</p></Card>;
  }

  if (!workspace || !workspace.batch) {
    return (
      <Card>
        <h3 className="p-5 text-[16px] font-bold text-on-surface">Batch Not Found</h3>
        <p className="p-5 text-[13px] text-on-surface-variant">Batch {batchId} was not found in the database.</p>
        <div className="px-5 pb-5">
          <Button variant="primary" onClick={() => navigate('/production')}>Go to Production</Button>
        </div>
      </Card>
    );
  }

  const batch = workspace.batch;
  const intelligence = workspace.intelligence || {};

  return (
    <div>
      <PageHeader
        title={`Batch ${batch.batch_id || batchId}`}
        subtitle="Connected batch lifecycle workspace"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" icon="refresh" onClick={() => { loadWorkspace(); refreshBatches(); }}>Refresh</Button>
            <Button variant="primary" icon="auto_awesome" onClick={() => navigate(`/dye-optimizer?batch_id=${batchId}`)}>Optimize</Button>
          </div>
        }
      />

      <BatchWorkflowStepper />

      {/* Batch header */}
      <Card className="mb-4">
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold text-on-surface font-mono-data">{batch.batch_id || batchId}</h2>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={
                  currentStatus === 'COMPLETED' || currentStatus === 'BATCH_COMPLETED' ? 'green' :
                  currentStatus === 'PRODUCTION_ACTIVE' || currentStatus === 'PRODUCTION_COMPLETED' ? 'blue' :
                  currentStatus === 'OPTIMIZATION_PENDING' || currentStatus === 'OPTIMIZED' ? 'purple' :
                  currentStatus === 'SHADE_VALIDATION' || currentStatus === 'WASTEWATER_ANALYSIS' ? 'amber' :
                  currentStatus === 'ETP_RECOMMENDATION' ? 'orange' : 'gray'
                }>
                  {currentStatus}
                </Badge>
                <span className="text-[12px] text-on-surface-variant">
                  {batch.fabric_type || '—'} · {batch.fiber_composition || '—'} · {batch.fabric_weight_kg || 0} kg · GSM {batch.gsm || '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-on-surface-variant">Target Shade:</span>
              <span className="font-mono-data text-[13px] font-semibold">
                L* {batch.target_shade?.target_l ?? '—'} · a* {batch.target_shade?.target_a ?? '—'} · b* {batch.target_shade?.target_b ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation tabs */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'recipe', label: 'Recipe' },
          { id: 'process', label: 'Process' },
          { id: 'shade', label: 'Shade' },
          { id: 'wastewater', label: 'Wastewater' },
          { id: 'etp', label: 'ETP' },
          { id: 'intelligence', label: 'Intelligence' },
          { id: 'report', label: 'Report' },
          { id: 'training', label: 'Training' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
              activeTab === tab.id ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader title="Fabric" subtitle="Material details" icon="layers" />
                <div className="p-5 text-[13px]">
                  <p><strong>Type:</strong> {batch.fabric_type || '—'}</p>
                  <p><strong>Composition:</strong> {batch.fiber_composition || '—'}</p>
                  <p><strong>Weight:</strong> {batch.fabric_weight_kg || 0} kg</p>
                  <p><strong>GSM:</strong> {batch.gsm || '—'}</p>
                  <p><strong>Machine:</strong> {batch.machine || '—'}</p>
                  <p><strong>Dye Class:</strong> {batch.dye_class || 'Reactive'}</p>
                </div>
              </Card>
              <Card>
                <CardHeader title="Optimization" subtitle="AI recipe" icon="auto_awesome" />
                <div className="p-5 text-[13px]">
                  <p><strong>Status:</strong> {batch.optimization_session?.status || 'Pending'}</p>
                  <p><strong>Session:</strong> {batch.optimization_id || '—'}</p>
                  {batch.confirmed_recipe ? <p><strong>Confirmed:</strong> Yes</p> : <p><strong>Confirmed:</strong> No</p>}
                </div>
              </Card>
              <Card>
                <CardHeader title="Shade Result" subtitle="Measured vs target" icon="palette" />
                <div className="p-5 text-[13px]">
                  {batch.shade_result ? (
                    <>
                      <p><strong>Measured:</strong> L* {batch.shade_result.measured_L} · a* {batch.shade_result.measured_a} · b* {batch.shade_result.measured_b}</p>
                      <p><strong>ΔE76:</strong> {batch.shade_result.delta_e_76 ?? '—'}</p>
                    </>
                  ) : (
                    <p className="text-on-surface-variant">No shade measurement yet</p>
                  )}
                </div>
              </Card>
              <Card>
                <CardHeader title="Wastewater" subtitle="Expected vs actual" icon="water_drop" />
                <div className="p-5 text-[13px]">
                  <p><strong>Status:</strong> {batch.prediction?.prediction_status || 'Pending'}</p>
                  <p><strong>Measurements:</strong> {batch.telemetry?.length || 0} readings</p>
                  <p><strong>Deviations:</strong> {intelligence.deviations?.process?.length || 0}</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Recipe Tab */}
        {activeTab === 'recipe' && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader title="Recipe Comparison" subtitle="Recommended vs Actual" icon="recipe" />
              <div className="p-5 text-[13px]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 font-bold text-primary">Recommended Recipe</h4>
                    {(batch.dyes || []).map((d: any, i: number) => (
                      <p key={i} className="mb-1">{d.dye_name || d.dye_id}: {d.planned_concentration}% OWF ({d.planned_quantity_kg} kg)</p>
                    ))}
                    {(batch.chemicals || []).map((c: any, i: number) => (
                      <p key={i} className="mb-1">{c.chemical_name}: {c.planned_dosage} {c.unit}</p>
                    ))}
                  </div>
                  <div>
                    <h4 className="mb-2 font-bold text-on-surface">Actual Recipe</h4>
                    {(batch.dyes || []).map((d: any, i: number) => (
                      <p key={i} className="mb-1">{d.dye_name || d.dye_id}: {d.actual_concentration ?? d.planned_concentration}% OWF ({d.actual_quantity_kg ?? d.planned_quantity_kg} kg)</p>
                    ))}
                    {(batch.chemicals || []).map((c: any, i: number) => (
                      <p key={i} className="mb-1">{c.chemical_name}: {c.actual_dosage ?? c.planned_dosage} {c.unit}</p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Process Tab */}
        {activeTab === 'process' && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader title="Process Parameters" subtitle="Planned vs Actual" icon="precision_manufacturing" />
              <div className="p-5 text-[13px]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <h4 className="mb-1 font-bold text-primary">Planned</h4>
                    {(batch.process || []).filter((p: any) => p.process_type === 'planned').map((p: any, i: number) => (
                      <div key={i}>
                        <p>Temperature: {p.temperature ?? '—'}°C</p>
                        <p>Time: {p.time_minutes ?? '—'} min</p>
                        <p>Liquor Ratio: 1:{p.liquor_ratio ?? '—'}</p>
                        <p>pH: {p.ph ?? '—'}</p>
                        <p>Machine: {p.machine ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <h4 className="mb-1 font-bold text-on-surface">Actual</h4>
                    {(batch.process || []).filter((p: any) => p.process_type === 'actual').map((p: any, i: number) => (
                      <div key={i}>
                        <p>Temperature: {p.temperature ?? '—'}°C</p>
                        <p>Time: {p.time_minutes ?? '—'} min</p>
                        <p>Liquor Ratio: 1:{p.liquor_ratio ?? '—'}</p>
                        <p>pH: {p.ph ?? '—'}</p>
                        <p>Machine: {p.machine ?? '—'}</p>
                      </div>
                    ))}
                    {((batch.process || []).filter((p: any) => p.process_type === 'actual').length === 0) && (
                      <p className="text-on-surface-variant">No actual process recorded yet</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Shade Tab */}
        {activeTab === 'shade' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Shade Measurement" subtitle="Record actual Lab* values" icon="palette" />
              <div className="p-5">
                <form onSubmit={handleShadeSubmit} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Measured L* (0-100)</label>
                      <input type="number" min={0} max={100} value={shadeForm.L} onChange={e => setShadeForm({...shadeForm, L: e.target.value})} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Measured a* (-128-127)</label>
                      <input type="number" min={-128} max={127} value={shadeForm.a} onChange={e => setShadeForm({...shadeForm, a: e.target.value})} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Measured b* (-128-127)</label>
                      <input type="number" min={-128} max={127} value={shadeForm.b} onChange={e => setShadeForm({...shadeForm, b: e.target.value})} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-on-surface-variant">Target: L* {batch.target_shade?.target_l ?? '—'} · a* {batch.target_shade?.target_a ?? '—'} · b* {batch.target_shade?.target_b ?? '—'}</p>
                    <Button variant="primary" icon="check_circle" disabled={shadeLoading} type="submit">Record Shade</Button>
                  </div>
                </form>
                {batch.shade_result && (
                  <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-[12.5px] text-emerald-900">
                    <p><strong>ΔE76:</strong> {batch.shade_result.delta_e_76 ?? '—'}</p>
                    <p className="text-[11.5px] text-emerald-700">Measured shade is associated with batch {batch.batch_id}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Wastewater Tab */}
        {activeTab === 'wastewater' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Wastewater Analysis" subtitle="Auto-populated from batch context" icon="water_drop"
                actions={
                  <div className="flex gap-2">
                    <Button variant="secondary" icon="water_drop" onClick={() => createWastewaterPrediction(batchId!)}>Predict</Button>
                  </div>
                }
              />
              <div className="p-5 text-[13px]">
                <p><strong>Prediction Status:</strong> {batch.prediction?.prediction_status || 'Pending'}</p>
                <div className="mt-2 space-y-1">
                  {batch.prediction?.predicted_profile && Object.entries(batch.prediction.predicted_profile).map(([k, v]: [string, any]) => (
                    <p key={k}><strong>{k}:</strong> {v ?? 'N/A'}</p>
                  ))}
                </div>
                <div className="mt-3">
                  <h4 className="font-bold">Expected vs Actual</h4>
                  {batch.comparison?.comparisons ? (
                    <table className="mt-2 w-full text-[12px]">
                      <thead><tr className="border-b border-slate-200"><th className="p-1 text-left">Parameter</th><th className="p-1 text-left">Expected</th><th className="p-1 text-left">Actual</th><th className="p-1 text-left">Deviation</th><th className="p-1 text-left">Status</th></tr></thead>
                      <tbody>
                        {batch.comparison.comparisons.map((c: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="p-1">{c.metric}</td>
                            <td className="p-1">{c.expected ?? '—'}</td>
                            <td className="p-1">{c.actual ?? '—'}</td>
                            <td className="p-1">{c.deviation ?? '—'}</td>
                            <td className="p-1"><Badge tone={c.status === 'NORMAL' ? 'green' : c.status === 'HIGH_DEVIATION' ? 'red' : 'amber'}>{c.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-on-surface-variant text-[12px]">Record wastewater measurements to see comparison</p>
                  )}
                </div>
                <div className="mt-3">
                  <h4 className="font-bold mb-1">Record Measurements</h4>
                  <p className="text-[11.5px] text-on-surface-variant mb-2">Parameters: pH, EC, TDS, Turbidity, COD, BOD, Color, Flow</p>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Parameter" id="ww-param" className="h-9 flex-1 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" />
                    <input type="number" placeholder="Value" id="ww-value" className="h-9 w-24 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" />
                    <input type="text" placeholder="Unit" id="ww-unit" className="h-9 w-20 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" />
                    <Button variant="primary" onClick={async () => {
                      const param = (document.getElementById('ww-param') as HTMLInputElement)?.value;
                      const value = Number((document.getElementById('ww-value') as HTMLInputElement)?.value);
                      const unit = (document.getElementById('ww-unit') as HTMLInputElement)?.value || 'mg/L';
                      if (!param || !value) return alert('Parameter and value are required');
                      const res = await recordWastewaterMeasurement(batchId!, [{ parameter: param, value, unit }], { data_source: 'manual_lab', quality: 'validated' });
                      if (res && res.success) { setWorkspace(null); loadWorkspace(); }
                    }}>Add</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ETP Tab */}
        {activeTab === 'etp' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="ETP Decision Support" subtitle="Advisory recommendations from batch wastewater data" icon="fact_check"
                actions={
                  <Button variant="primary" icon="science" onClick={handleETP} disabled={!batchId}>Generate ETP</Button>
                }
              />
              <div className="p-5 text-[13px]">
                {etpResult ? (
                  <div className="space-y-3">
                    <p><strong>Recommendation:</strong> {etpResult.recommendation}</p>
                    <p><strong>Reason:</strong> {etpResult.reason}</p>
                    <p><strong>Evidence Level:</strong> {etpResult.evidence_level || 'advisory_reference_range'}</p>
                    <p><strong>Human Validation:</strong> {etpResult.human_validation_status || 'pending'}</p>
                    {etpResult.strategies && etpResult.strategies.map((s: any, i: number) => (
                      <div key={i}><strong>{s.stage}:</strong> {s.action}</div>
                    ))}
                    {(etpResult.warnings || []).map((w: string, i: number) => (
                      <p key={i} className="rounded bg-amber-50 p-2 text-[12px] text-amber-800">⚠ {w}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-on-surface-variant">Click "Generate ETP" to create advisory recommendation from batch wastewater data.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Intelligence Tab */}
        {activeTab === 'intelligence' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Batch Intelligence" subtitle="Deviations, anomalies, and contributing factors" icon="fact_check" />
              <div className="p-5 text-[13px]">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Recipe Deviations</h4>
                    {(intelligence.deviations?.recipe?.length || 0) === 0 ? (
                      <p className="text-emerald-700">No recipe deviations detected.</p>
                    ) : (
                      intelligence.deviations.recipe.map((d: any, i: number) => (
                        <p key={i} className="rounded bg-amber-50 p-2 text-[12px] text-amber-900">⚠ {d.dye_name || d.type}: planned {d.planned} → actual {d.actual} (Δ {d.deviation})</p>
                      ))
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Process Deviations</h4>
                    {(intelligence.deviations?.process?.length || 0) === 0 ? (
                      <p className="text-emerald-700">No process deviations detected.</p>
                    ) : (
                      intelligence.deviations.process.map((d: any, i: number) => (
                        <p key={i} className="rounded bg-amber-50 p-2 text-[12px] text-amber-900">⚠ {d.parameter || d.type}: planned {d.planned} → actual {d.actual} (Δ {d.deviation})</p>
                      ))
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Shade Deviation</h4>
                    {intelligence.deviations?.shade ? (
                      <p>ΔE76: {intelligence.deviations.shade.delta_e_76 ?? 'N/A'}</p>
                    ) : (
                      <p className="text-on-surface-variant">No shade deviation data</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Potential Contributing Factors</h4>
                    {(intelligence.potential_factors || []).map((f: any, i: number) => (
                      <div key={i} className="rounded bg-slate-50 p-2 text-[12px]">
                        <strong>{f.category}:</strong> {f.description} ({f.items?.join(', ') || ''})
                      </div>
                    ))}
                    {(intelligence.potential_factors?.length === 0) && <p className="text-on-surface-variant">Insufficient data to identify factors.</p>}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface mb-2">Missing Information</h4>
                    {(intelligence.missing_information || []).length === 0 ? (
                      <p className="text-emerald-700">All required data recorded.</p>
                    ) : (
                      (intelligence.missing_information || []).map((m: string, i: number) => (
                        <p key={i} className="text-amber-700">⚠ {m}</p>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Batch Report" subtitle="Complete traceability across the lifecycle" icon="description"
                actions={
                  <Button variant="primary" icon="auto_awesome" onClick={handleReport}>Generate Report</Button>
                }
              />
              <div className="p-5 text-[13px]">
                {reportResult ? (
                  <div className="space-y-3">
                    <div className="rounded bg-slate-50 p-3">
                      <p><strong>Report ID:</strong> {reportResult.report_id}</p>
                      <p><strong>Batch:</strong> {reportResult.batch_id}</p>
                      <p><strong>Generated:</strong> {reportResult.generated_at}</p>
                    </div>
                    <div>
                      <h4 className="font-bold">Production Order</h4>
                      <p>{reportResult.production_order?.order_number} · {reportResult.production_order?.fabric_type}</p>
                    </div>
                    <div>
                      <h4 className="font-bold">Optimization</h4>
                      <p>Status: {reportResult.optimization?.status}</p>
                    </div>
                    <div>
                      <h4 className="font-bold">Shade ΔE</h4>
                      <p>{reportResult.shade?.delta_e_76 ?? 'N/A'}</p>
                    </div>
                    <div>
                      <h4 className="font-bold">Training Readiness</h4>
                      <p>Eligibility: {reportResult.training_readiness?.eligibility}</p>
                      {reportResult.training_readiness?.issues?.length > 0 && (
                        <ul className="list-disc pl-5 text-[12px]">
                          {reportResult.training_readiness.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold">Data Quality</h4>
                      <p>Source: {reportResult.data_source} · Quality: {reportResult.data_quality_status}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant">Click "Generate Report" to create a complete batch traceability report.</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Training Tab */}
        {activeTab === 'training' && (
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader title="Training Data Readiness" subtitle="Eligibility evaluation for ML dataset" icon="verified"
                actions={
                  <Button variant="primary" icon="verified" onClick={handleTrainingReadiness}>Evaluate</Button>
                }
              />
              <div className="p-5 text-[13px]">
                {trainingResult ? (
                  <div className="space-y-3">
                    <div className={`rounded-lg p-4 text-[14px] font-bold ${trainingResult.eligibility === 'ELIGIBLE' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                      Training Eligibility: {trainingResult.eligibility}
                    </div>
                    <p><strong>Training Ready:</strong> {trainingResult.training_ready ? 'Yes' : 'No'}</p>
                    <p><strong>Data Source:</strong> {trainingResult.data_source}</p>
                    <p><strong>Data Quality:</strong> {trainingResult.data_quality_status}</p>
                    <p><strong>Has Measured Lab:</strong> {trainingResult.has_measured_lab ? 'Yes' : 'No'}</p>
                    <p><strong>ΔE76:</strong> {trainingResult.delta_e_76 ?? 'N/A'}</p>
                    {(trainingResult.issues || []).length > 0 && (
                      <div>
                        <h4 className="font-bold mb-1">Issues:</h4>
                        <ul className="list-disc pl-5 text-[12px]">
                          {(trainingResult.issues || []).map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {trainingResult.eligibility === 'ELIGIBLE' && (
                      <div className="rounded-lg bg-emerald-50 p-3 text-[12.5px] text-emerald-900">
                        ✓ This batch is eligible for supervised ML training once the training threshold is reached.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-on-surface-variant">Click "Evaluate" to check training eligibility for this batch.</p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
