import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { fetchBatchIntelligence, fetchFabrics, fetchMachines } from '../services/apiClient';
import { useBatch } from '../context/BatchContext';
import { BatchWorkflowStepper } from '../components/workflow/BatchWorkflowStepper';

export function ProductionPage() {
  const { batches, activeBatchId, selectBatch, createBatch, refreshBatches, isLoadingBatches } = useBatch();
  const [intel, setIntel] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Form state for creating a new batch
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [fabricId, setFabricId] = useState('COTTON-001');
  const [weightKg, setWeightKg] = useState(200);
  const [dyeClass, setDyeClass] = useState('Reactive');
  const [machineId, setMachineId] = useState('JET-01');
  const [L, setL] = useState(45);
  const [A, setA] = useState(10);
  const [B, setB] = useState(-20);

  useEffect(() => {
    fetchFabrics().then((res) => res?.fabrics && setFabrics(res.fabrics)).catch(() => {});
    fetchMachines().then((res) => res?.machines && setMachines(res.machines)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeBatchId) {
      setIntel(null);
      return;
    }
    fetchBatchIntelligence(activeBatchId).then(setIntel).catch(() => setIntel(null));
  }, [activeBatchId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedFabric = fabrics.find((f) => f.id === fabricId);
      const res = await createBatch({
        material: {
          fabric_id: fabricId,
          fabric_type: selectedFabric?.name || 'Cotton Single Jersey',
          fiber_composition: selectedFabric?.composition || [{ fiber: 'Cotton', percentage: 100 }],
          weight_kg: Number(weightKg),
          gsm: selectedFabric?.gsm_reference || 180,
        },
        target_shade: {
          L: Number(L),
          a: Number(A),
          b: Number(B),
          color_space: 'CIELAB',
          shade_depth: 'Medium',
        },
        dye_class: dyeClass,
        machine: { machine_id: machineId },
      });

      if (res && res.success) {
        setIsModalOpen(false);
        // Automatically take the user to Step 2: Dye Optimizer
        navigate('/dye-optimizer');
      } else {
        alert(res?.error?.message || 'Failed to create batch');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBatchObj = batches.find((b) => (b.batch_id || b.id) === activeBatchId);

  return (
    <>
      <PageHeader
        title="Production Management"
        subtitle="Manage master textile dyeing batches across the end-to-end industrial lifecycle."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon="refresh"
              onClick={() => refreshBatches()}
              disabled={isLoadingBatches}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon="add"
              onClick={() => setIsModalOpen(true)}
            >
              New Production Batch
            </Button>
          </div>
        }
      />

      {/* Unified Pipeline Stepper */}
      <BatchWorkflowStepper />

      {isLoadingBatches && (
        <Card>
          <p className="p-5 text-[13px] text-on-surface-variant">Loading production batches...</p>
        </Card>
      )}

      {!isLoadingBatches && batches.length === 0 && (
        <Card>
          <CardHeader title="Production Batches" subtitle="Live database" icon="assignment" />
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="playlist_add" className="text-[28px]" />
            </div>
            <h3 className="text-[16px] font-bold text-on-surface">No Production Batches Found</h3>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-on-surface-variant">
              Initialize a production batch with fabric specifications, target shade, and machine configuration to start the end-to-end workflow.
            </p>
            <div className="mt-4">
              <Button variant="primary" icon="add" onClick={() => setIsModalOpen(true)}>
                Create First Production Batch
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!isLoadingBatches && batches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Batches List */}
          <Card className="lg:col-span-1">
            <CardHeader
              title="Batches"
              subtitle={`${batches.length} registered in system`}
              icon="assignment"
              actions={
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-[12px] font-semibold text-primary hover:underline"
                >
                  + New
                </button>
              }
            />
            <div className="max-h-[500px] overflow-auto p-3">
              {batches.map((b: any) => {
                const bId = b.batch_id || b.id;
                const isSelected = bId === activeBatchId;
                return (
                  <button
                    key={bId}
                    type="button"
                    onClick={() => selectBatch(bId)}
                    className={`mb-2 w-full rounded-xl border p-3.5 text-left text-[13px] transition ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40'
                        : 'border-slate-100 hover:border-primary/40 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-data font-bold text-on-surface">{bId}</span>
<Badge
                          tone={
                            b.lifecycle_status === 'BATCH_COMPLETED'
                              ? 'green'
                              : b.lifecycle_status === 'PRODUCTION_ACTIVE'
                              ? 'blue'
                              : b.lifecycle_status === 'RECIPE_CONFIRMED'
                              ? 'purple'
                              : b.lifecycle_status === 'ETP_REVIEW'
                              ? 'orange'
                              : 'gray'
                          }
                        >
                          {b.lifecycle_status || b.status || 'DRAFT'}
                        </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[12px] text-on-surface-variant">
                      <span>{b.fabric_type || b.dye_class || 'Textile Batch'}</span>
                      <span>{b.weight_kg ? `${b.weight_kg} kg` : '—'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Batch Dossier & Intelligence */}
          <Card className="lg:col-span-2">
            <CardHeader
              title="Batch Lifecycle Intelligence"
              subtitle={activeBatchId ? `Planned vs Actual · ${activeBatchId}` : 'Select a batch'}
              icon="fact_check"
              actions={
                activeBatchId ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/dye-optimizer')}
                      className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Icon name="auto_awesome" className="text-[14px]" />
                      Optimizer
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/iot')}
                      className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Icon name="sensors" className="text-[14px]" />
                      IoT Monitor
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/etp')}
                      className="flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Icon name="science" className="text-[14px]" />
                      ETP Decision
                    </button>
                  </div>
                ) : undefined
              }
            />
            <div className="p-5 text-[13px]">
              {!selectedBatchObj && (
                <p className="text-on-surface-variant">Select a batch to inspect its parameters and telemetry.</p>
              )}

              {selectedBatchObj && (
                <div className="space-y-5">
                  {/* Status Summary Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Current Lifecycle Status
                      </p>
                      <p className="text-[16px] font-bold text-on-surface">
                        {selectedBatchObj.lifecycle_status || selectedBatchObj.status || 'DRAFT'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                        Target Shade
                      </p>
                      <p className="font-mono-data text-[13px] font-semibold">
                        L* {selectedBatchObj.target_shade?.L ?? 45} · a* {selectedBatchObj.target_shade?.a ?? 10} · b* {selectedBatchObj.target_shade?.b ?? -20}
                      </p>
                    </div>
                  </div>

                  {/* Deviations & Telemetry */}
                  <div>
                    <h4 className="text-[14px] font-bold text-on-surface">Telemetry & Deviations</h4>
                    {!intel || (!intel.deviations?.recipe?.length && !intel.deviations?.process?.length && !intel.deviations?.shade) ? (
                      <p className="mt-1 text-on-surface-variant">
                        No recipe or process deviations recorded. Actual values match planned thresholds or monitoring is pending.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5 pl-2 text-[12.5px]">
                        {[...(intel.deviations?.recipe ?? []), ...(intel.deviations?.process ?? [])].map((d: any, i: number) => (
                          <li key={i} className="flex items-center gap-2 rounded-lg bg-amber-50/80 p-2 text-amber-900">
                            <Icon name="warning" className="text-[16px] text-amber-600" />
                            <span>
                              <strong>{d.type || 'Parameter'} {d.dye_name || d.chemical_name || d.parameter || ''}:</strong> planned {String(d.planned)} → actual {String(d.actual)} (Δ {String(d.deviation)})
                            </span>
                          </li>
                        ))}
                        {intel.deviations?.shade && (
                          <li className="flex items-center gap-2 rounded-lg bg-blue-50/80 p-2 text-blue-900">
                            <Icon name="info" className="text-[16px] text-blue-600" />
                            <span>
                              <strong>Shade ΔE76:</strong> {String(intel.deviations.shade.delta_e_76)}
                            </span>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Missing information honesty check */}
                  {intel && (intel.missing_information ?? []).length > 0 && (
                    <div>
                      <h4 className="text-[14px] font-bold text-on-surface">Data Completeness</h4>
                      <ul className="mt-1 list-disc pl-5 text-[12.5px] text-on-surface-variant">
                        {intel.missing_information.map((m: string, i: number) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action recommendation */}
                  <div className="rounded-xl border border-slate-200/80 p-4">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Next Recommended Action
                    </p>
                    {selectedBatchObj.lifecycle_status === 'OPTIMIZATION_PENDING' && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-on-surface">
                          Material parameters defined. Run AI optimization to evaluate recipes and water volume.
                        </p>
                        <Button variant="primary" icon="auto_awesome" onClick={() => navigate('/dye-optimizer')}>
                          Run Optimization
                        </Button>
                      </div>
                    )}
                    {selectedBatchObj.lifecycle_status === 'OPTIMIZATION_READY' && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-on-surface">
                          Optimization complete. Review recommended recipe and confirm to proceed.
                        </p>
                        <Button variant="primary" icon="check_circle" onClick={() => navigate('/dye-optimizer')}>
                          Confirm Recipe
                        </Button>
                      </div>
                    )}
                    {selectedBatchObj.lifecycle_status === 'RECIPE_CONFIRMED' && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-on-surface">
                          Recipe confirmed & wastewater profile generated. Start ESP32 IoT monitoring session.
                        </p>
                        <Button variant="primary" icon="sensors" onClick={() => navigate('/iot')}>
                          Start IoT Session
                        </Button>
                      </div>
                    )}
                    {selectedBatchObj.lifecycle_status === 'PRODUCTION_ACTIVE' && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-on-surface">
                          Live telemetry actively streaming. Compare expected vs actual and inspect ETP advisory.
                        </p>
                        <Button variant="ai" icon="science" onClick={() => navigate('/etp')}>
                          ETP Decision Support
                        </Button>
                      </div>
                    )}
                    {selectedBatchObj.lifecycle_status === 'ETP_REVIEW' && (
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-[13px] text-on-surface">
                          ETP recommendation available. Review treatment strategy and complete the batch.
                        </p>
                        <Button variant="ai" icon="check_circle" onClick={() => navigate('/etp')}>
                          Complete Batch
                        </Button>
                      </div>
                    )}
                    {selectedBatchObj.lifecycle_status === 'BATCH_COMPLETED' && (
                      <div className="mt-2">
                        <p className="text-[13px] text-emerald-800 font-medium">
                          ✓ Batch successfully completed. Telemetry and recipe archived into the ML training dataset pool.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* New Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-[16px] font-bold text-on-surface">Create New Production Batch</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-slate-100"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="mb-1 block font-semibold text-on-surface-variant">Fabric Specification</label>
                <select
                  value={fabricId}
                  onChange={(e) => setFabricId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"
                >
                  {fabrics.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.construction}) — {f.recipe_id}
                    </option>
                  ))}
                  {fabrics.length === 0 && <option value="COTTON-001">Cotton Single Jersey (COTTON-001)</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-on-surface-variant">Fabric Weight (kg)</label>
                  <input
                    type="number"
                    min={1}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-on-surface-variant">Machine</label>
                  <select
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} ({m.label})
                      </option>
                    ))}
                    {machines.length === 0 && <option value="JET-01">JET-01 (High Temperature Jet)</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-on-surface-variant">Dye Class</label>
                  <select
                    value={dyeClass}
                    onChange={(e) => setDyeClass(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary"
                  >
                    <option>Reactive</option>
                    <option>Disperse</option>
                    <option>Acid</option>
                    <option>Vat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-on-surface-variant">Target Shade (CIELAB)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-on-surface-variant">L* (0–100)</span>
                    <input
                      type="number"
                      value={L}
                      onChange={(e) => setL(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-200 px-2 text-[12px] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-on-surface-variant">a* (−128–127)</span>
                    <input
                      type="number"
                      value={A}
                      onChange={(e) => setA(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-200 px-2 text-[12px] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-on-surface-variant">b* (−128–127)</span>
                    <input
                      type="number"
                      value={B}
                      onChange={(e) => setB(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-200 px-2 text-[12px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" icon="arrow_forward" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Batch & Proceed to Optimizer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
