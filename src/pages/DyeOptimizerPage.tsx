import { useEffect, useMemo, useState } from 'react';
import { PageHeader, Button } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  fetchFabrics, fetchFibers, fetchDyeClasses, fetchMachines,
  fetchRecipeResources, runDyeOptimization,
} from '../services/apiClient';

// CIELAB -> sRGB preview (standard conversion, D65). Returns css rgb() string.
function labToCss(L: number, a: number, b: number): string {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const f = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  let x = 95.047 * f(fx), y = 100 * f(fy), z = 108.883 * f(fz);
  x /= 100; y /= 100; z /= 100;
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 + y * -0.204 + z * 1.057;
  const conv = (c: number) => {
    c = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, c)) * 255);
  };
  return `rgb(${conv(r)}, ${conv(g)}, ${conv(bl)})`;
}

function fmt(n: any, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'N/A';
  return Number(n).toFixed(digits);
}

function compLabel(c: any): string {
  return `${c.fiber} ${c.percentage}%`;
}

export function DyeOptimizerPage() {
  // ---- reference data ----
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [fibers, setFibers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState<string | null>(null);

  // ---- material ----
  const [fabricSearch, setFabricSearch] = useState('');
  const [fabricId, setFabricId] = useState('');
  const [composition, setComposition] = useState<any[]>([]);
  const [customComp, setCustomComp] = useState(false);
  const [weightKg, setWeightKg] = useState<number>(200);
  const [gsm, setGsm] = useState<number>(180);

  // ---- shade ----
  const [L, setL] = useState<number>(45);
  const [A, setA] = useState<number>(10);
  const [B, setB] = useState<number>(-20);
  const [shadeDepth, setShadeDepth] = useState('Medium');

  // ---- process ----
  const [dyeClasses, setDyeClasses] = useState<any[]>([]);
  const [dyeClass, setDyeClass] = useState('');
  const [machineId, setMachineId] = useState('');
  const [liquor, setLiquor] = useState<number>(8);
  const [temp, setTemp] = useState<number>(80);
  const [timeMin, setTimeMin] = useState<number>(60);
  const [ph, setPh] = useState<number>(7.5);

  // ---- resources / result ----
  const [resources, setResources] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [f, fi, m] = await Promise.all([fetchFabrics(), fetchFibers(), fetchMachines()]);
      if (!live) return;
      if (!f && !fi && !m) setRefsError('Unable to retrieve optimization data. Check backend connection.');
      setFabrics(f?.fabrics ?? []);
      setFibers(fi?.fibers ?? []);
      setMachines(m?.machines ?? []);
      setRefsLoading(false);
    })();
    return () => { live = false; };
  }, []);

  const fabric = useMemo(() => fabrics.find((x) => x.id === fabricId) || null, [fabrics, fabricId]);
  const machine = useMemo(() => machines.find((x) => x.id === machineId) || null, [machines, machineId]);
  const filteredFabrics = useMemo(() => {
    const q = fabricSearch.trim().toLowerCase();
    if (!q) return fabrics;
    return fabrics.filter((f) =>
      `${f.name} ${f.full_description} ${f.construction} ${(f.composition || []).map(compLabel).join(' ')}`.toLowerCase().includes(q));
  }, [fabrics, fabricSearch]);

  const compTotal = useMemo(
    () => composition.reduce((s, c) => s + (Number(c.percentage) || 0), 0), [composition]);
  const compValid = composition.length > 0 && Math.abs(compTotal - 100) <= 0.01 &&
    composition.every((c) => c.fiber && Number(c.percentage) >= 0 && Number(c.percentage) <= 100) &&
    new Set(composition.map((c) => String(c.fiber).toLowerCase())).size === composition.length;

  async function selectFabric(id: string) {
    setFabricId(id);
    setCustomComp(false);
    const f = fabrics.find((x) => x.id === id);
    if (f) {
      setComposition((f.composition || []).map((c: any) => ({ ...c })));
      if (f.gsm_reference) setGsm(f.gsm_reference);
      const dc = await fetchDyeClasses(id);
      const list = dc?.dye_classes ?? [];
      setDyeClasses(list);
      setDyeClass(list.length === 1 ? list[0].label : '');
      if (f.recipe_id) setResources(await fetchRecipeResources(f.recipe_id));
      else setResources(null);
    } else {
      setComposition([]);
      setDyeClasses([]);
      setDyeClass('');
      setResources(null);
    }
  }

  function editCompRow(i: number, patch: any) {
    setComposition((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setCustomComp(true);
  }
  function addFiber() {
    const firstUnused = fibers.find((f) => !composition.some((c) => String(c.fiber).toLowerCase() === String(f.name).toLowerCase()));
    setComposition((prev) => [...prev, { fiber: firstUnused ? firstUnused.name : '', percentage: 0 }]);
    setCustomComp(true);
  }
  function removeFiber(i: number) {
    setComposition((prev) => prev.filter((_, j) => j !== i));
    setCustomComp(true);
  }

  async function run() {
    setFormError(null);
    setResult(null);
    if (!fabricId) { setFormError('Select a validated fabric before running optimization.'); return; }
    if (!compValid) { setFormError(`Fiber composition must total 100%. Current total: ${+compTotal.toFixed(2)}%.`); return; }
    if (!dyeClass) { setFormError('Select a dye class validated for this material.'); return; }
    if (!machineId) { setFormError('Select a validated machine before running optimization.'); return; }
    setRunning(true);
    try {
      const payload = {
        material: {
          fabric_id: fabricId,
          fabric_type: fabric?.full_description,
          fiber_composition: composition.map((c) => ({ fiber: c.fiber, percentage: Number(c.percentage) })),
          weight_kg: Number(weightKg),
          gsm: Number(gsm),
        },
        target_shade: { L: Number(L), a: Number(A), b: Number(B), color_space: 'CIELAB', shade_depth: shadeDepth },
        dye_class: dyeClass,
        machine: { machine_id: machineId },
        process: { liquor_ratio: Number(liquor), temperature_c: Number(temp), time_minutes: Number(timeMin), ph: Number(ph) },
        optimization_preferences: { shade_weight: 1.0, cost_weight: 0.5, water_weight: 0.0 },
      };
      const res: any = await runDyeOptimization(payload);
      setResult(res);
    } catch (e: any) {
      setResult({ success: false, error: { code: 'REQUEST_FAILED', message: e?.message || 'Request failed' } });
    } finally {
      setRunning(false);
    }
  }

  const opt = result?.optimization || null;
  const tier = opt?.model_tier || null;
  const tierBadge = tier === 'validated_model'
    ? <Badge tone="green">VALIDATED MODEL</Badge>
    : tier === 'demo_synthetic'
      ? <Badge tone="purple">DEMO / SYNTHETIC MODEL</Badge>
      : tier === 'model_unavailable'
        ? <Badge tone="amber">MODEL NOT AVAILABLE</Badge> : null;
  const reqBadge = opt
    ? opt.status === 'completed'
      ? <Badge tone="blue">REQUEST COMPLETED</Badge>
      : opt.status === 'partial'
        ? <Badge tone="amber">REQUEST PARTIAL</Badge>
        : <Badge tone="red">REQUEST FAILED</Badge>
    : null;

  return (
    <>
      <PageHeader
        title="Dye Recipe Optimizer"
        subtitle="AI-assisted shade and recipe optimization over validated textile reference data."
        actions={<Button variant="primary" icon="auto_awesome" onClick={run} disabled={running}>{running ? 'Optimizing…' : 'Generate Optimization'}</Button>}
      />

      {refsLoading && <Card><p className="p-5 text-[13px] text-on-surface-variant">Loading fabric and reference data…</p></Card>}
      {refsError && <Card><p className="p-5 text-[13px] text-red-700">{refsError}</p></Card>}

      {!refsLoading && !refsError && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ============ INPUTS ============ */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardHeader title="Material" subtitle="Validated fabric definitions only" icon="layers" />
              <div className="space-y-3 p-5">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Search fabrics…</span>
                  <input value={fabricSearch} onChange={(e) => setFabricSearch(e.target.value)} placeholder="e.g. jersey, polyester, twill"
                    className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Fabric</span>
                  <select value={fabricId} onChange={(e) => selectFabric(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none focus:border-primary">
                    <option value="">Select fabric ▼</option>
                    {filteredFabrics.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} — {(f.composition || []).map(compLabel).join(' / ')} · {f.construction}</option>
                    ))}
                  </select>
                </label>
                {fabrics.length === 0 && <p className="text-[12px] text-amber-700">No validated fabric definitions are currently available.</p>}
                {fabric && (
                  <div className="rounded-md bg-slate-50 p-3 text-[12px]">
                    <p><strong>Construction:</strong> {fabric.construction} (auto)</p>
                    <p><strong>Reference:</strong> {fabric.recipe_id} · GSM {fabric.gsm_reference ?? '—'}</p>
                  </div>
                )}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11.5px] font-semibold text-on-surface-variant">Fiber Composition {customComp && <Badge tone="purple">Custom composition</Badge>}</span>
                    <button type="button" onClick={addFiber} className="text-[12px] font-semibold text-primary">+ Add Fiber</button>
                  </div>
                  {composition.map((c, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2">
                      <select value={c.fiber} onChange={(e) => editCompRow(i, { fiber: e.target.value })}
                        className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none">
                        <option value="">Fiber ▼</option>
                        {fibers.map((f) => <option key={f.id} value={f.name}>{f.name}</option>)}
                      </select>
                      <input type="number" min={0} max={100} value={c.percentage} onChange={(e) => editCompRow(i, { percentage: Number(e.target.value) })}
                        className="h-9 w-20 rounded-md border border-slate-200 px-2 text-[13px] outline-none" />
                      <span className="text-[12px] text-on-surface-variant">%</span>
                      <button type="button" onClick={() => removeFiber(i)} aria-label="Remove fiber"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-slate-100">×</button>
                    </div>
                  ))}
                  <p className={`text-[12px] font-semibold ${compValid ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Total: {+compTotal.toFixed(2)}% {composition.length > 0 && !compValid && '— ERROR: composition must total 100% with no duplicate fibers.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Weight (kg)</span>
                    <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">GSM (g/m²)</span>
                    <input type="number" value={gsm} onChange={(e) => setGsm(Number(e.target.value))}
                      className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" />
                  </label>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Target Shade" subtitle="CIELAB color space" icon="palette" />
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-3 gap-3">
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">L* (0–100)</span>
                    <input type="number" min={0} max={100} value={L} onChange={(e) => setL(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">a* (−128–127)</span>
                    <input type="number" min={-128} max={127} value={A} onChange={(e) => setA(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">b* (−128–127)</span>
                    <input type="number" min={-128} max={127} value={B} onChange={(e) => setB(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                </div>
                <p className="text-[11.5px] text-on-surface-variant">L* = Lightness · a* = Green ↔ Red · b* = Blue ↔ Yellow</p>
                <div className="flex items-center gap-3">
                  <span className="inline-block h-10 w-16 rounded-md border border-slate-200" style={{ backgroundColor: labToCss(L, A, B) }} />
                  <label className="block flex-1">
                    <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Shade Depth</span>
                    <select value={shadeDepth} onChange={(e) => setShadeDepth(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none">
                      <option>Light</option><option>Medium</option><option>Dark</option>
                    </select>
                  </label>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Dyeing Process" subtitle="Machine-validated parameters" icon="precision_manufacturing" />
              <div className="space-y-3 p-5">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Dye Class</span>
                  <select value={dyeClass} onChange={(e) => setDyeClass(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none">
                    <option value="">{fabricId ? 'Select dye class ▼' : 'Select a fabric first'}</option>
                    {dyeClasses.map((d) => <option key={d.label} value={d.label}>{d.label}</option>)}
                  </select>
                </label>
                {fabricId && dyeClasses.length === 0 && <p className="text-[12px] text-amber-700">No validated dye class available for this material.</p>}
                <label className="block">
                  <span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Machine</span>
                  <select value={machineId} onChange={(e) => setMachineId(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none">
                    <option value="">Select machine ▼</option>
                    {machines.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.label}</option>)}
                  </select>
                </label>
                {machine && (
                  <div className="rounded-md bg-slate-50 p-3 text-[12px]">
                    <p><strong>Type:</strong> {machine.type ?? '—'}</p>
                    <p><strong>Capacity:</strong> {machine.continuous ? 'Continuous line (meters, not kg)' : `${machine.min_batch_kg ?? '—'}–${machine.max_batch_kg ?? '—'} kg`}</p>
                    <p><strong>Max temperature:</strong> {machine.max_temperature_c ?? 'not configured'} °C</p>
                    <p><strong>Liquor ratio:</strong> {(machine.liquor_ratio_min && machine.liquor_ratio_max) ? `1:${machine.liquor_ratio_min}–1:${machine.liquor_ratio_max}` : 'not configured'}</p>
                    {machine.fabric_restrictions && <p><strong>Limits:</strong> {machine.fabric_restrictions}</p>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Liquor Ratio (1:X)</span>
                    <input type="number" min={1} value={liquor} onChange={(e) => setLiquor(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Temperature (°C)</span>
                    <input type="number" value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Time (min)</span>
                    <input type="number" min={1} value={timeMin} onChange={(e) => setTimeMin(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">pH (0–14)</span>
                    <input type="number" min={0} max={14} step={0.1} value={ph} onChange={(e) => setPh(Number(e.target.value))} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Available Resources" subtitle="From validated standard recipe" icon="inventory" />
              {!resources && <p className="p-5 text-[12.5px] text-on-surface-variant">Select a fabric to view its reference dyes and chemicals. No live inventory tables exist; stock availability is not checked.</p>}
              {resources && (
                <div className="space-y-2 p-5 text-[12.5px]">
                  <p><strong>Dyes ({resources.dyes?.length ?? 0}):</strong> {(resources.dyes || []).map((d: any) => `${d.name} (${d.pct_owf}% OWF)`).join('; ') || '—'}</p>
                  <p><strong>Chemicals ({resources.chemicals?.length ?? 0}):</strong> {(resources.chemicals || []).map((c: any) => `${c.name} (${c.dosage})`).join('; ') || '—'}</p>
                  <p className="text-[11.5px] text-on-surface-variant">{resources.note}</p>
                </div>
              )}
            </Card>
          </div>

          {/* ============ RESULT ============ */}
          <Card className="lg:col-span-2">
            <CardHeader title="Result" subtitle={opt ? `Model: ${opt.model_status?.status ?? '—'} · Request: ${opt.status}` : 'No result yet'} icon="fact_check"
              actions={<>{reqBadge} {tierBadge}</>} />
            <div className="p-5">
              {!result && <p className="text-[13px] text-on-surface-variant">Select material, shade and process, then click Generate Optimization.</p>}
              {formError && <p className="rounded-md bg-red-50 p-3 text-[12.5px] font-semibold text-red-700">{formError}</p>}
              {result && !result.success && (
                <div className="space-y-2">
                  <p className="font-semibold text-red-700">Request failed validation</p>
                  {(result.error?.details || []).map((d: any, i: number) => (
                    <p key={i} className="rounded-md bg-red-50 p-2 text-[12.5px] text-red-800"><strong>{d.code}</strong> · {d.message} <span className="text-red-500">({d.field})</span></p>
                  ))}
                  {!result.error?.details?.length && <p className="text-[13px]">{result.error?.message}</p>}
                </div>
              )}
              {opt && (
                <div className="space-y-5">
                  <div className={`rounded-md p-3 text-[12.5px] ${tier === 'validated_model' ? 'bg-emerald-50 text-emerald-800' : tier === 'demo_synthetic' ? 'bg-purple-50 text-purple-800' : 'bg-amber-50 text-amber-800'}`}>
                    {opt.model_tier_message}
                  </div>

                  {opt.recommended_recipe ? (
                    <>
                      <div>
                        <h4 className="text-[14px] font-bold">Recommended Recipe — {opt.recommended_recipe.candidate_id}</h4>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-lg border border-slate-100 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Predicted Shade</p>
                            {opt.recommended_recipe.predicted_lab?.L !== null && opt.recommended_recipe.predicted_lab?.L !== undefined ? (
                              <>
                                <span className="mt-2 inline-block h-8 w-full rounded border border-slate-200" style={{ backgroundColor: labToCss(opt.recommended_recipe.predicted_lab.L, opt.recommended_recipe.predicted_lab.a, opt.recommended_recipe.predicted_lab.b) }} />
                                <p className="mt-1 font-mono-data text-[13px]">L* {fmt(opt.recommended_recipe.predicted_lab.L)} · a* {fmt(opt.recommended_recipe.predicted_lab.a)} · b* {fmt(opt.recommended_recipe.predicted_lab.b)}</p>
                              </>
                            ) : <p className="mt-1 text-[12.5px] text-on-surface-variant">Unavailable — no validated ML model.</p>}
                          </div>
                          <div className="rounded-lg border border-slate-100 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Target Shade</p>
                            <span className="mt-2 inline-block h-8 w-full rounded border border-slate-200" style={{ backgroundColor: labToCss(opt.target_lab.L, opt.target_lab.a, opt.target_lab.b) }} />
                            <p className="mt-1 font-mono-data text-[13px]">L* {fmt(opt.target_lab.L)} · a* {fmt(opt.target_lab.a)} · b* {fmt(opt.target_lab.b)}</p>
                          </div>
                          <div className="rounded-lg border border-slate-100 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Color Difference</p>
                            <p className="mt-2 font-mono-data text-[22px] font-bold">ΔE76 {opt.recommended_recipe.delta_e !== null ? fmt(opt.recommended_recipe.delta_e) : 'N/A'}</p>
                            <p className="mt-1 text-[11.5px] text-on-surface-variant">ΔE interpretation threshold not configured — numeric value only, no pass/fail claim.</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Recipe — Dyes</p>
                          {(opt.recommended_recipe.dyes || []).map((d: any, i: number) => (
                            <p key={i} className="mt-1 text-[12.5px]"><strong>{d.dye_id}</strong> — {d.percentage_owf} % OWF ({d.quantity_kg} kg)</p>
                          ))}
                          {!(opt.recommended_recipe.dyes || []).length && <p className="text-[12px] text-on-surface-variant">—</p>}
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Chemicals</p>
                          {(opt.recommended_recipe.chemicals || []).map((c: any, i: number) => (
                            <p key={i} className="mt-1 text-[12.5px]"><strong>{c.chemical_id}</strong> — {c.dosage} {c.unit}</p>
                          ))}
                          {!(opt.recommended_recipe.chemicals || []).length && <p className="text-[12px] text-on-surface-variant">—</p>}
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Process</p>
                          <p className="mt-1 text-[12.5px]">Temperature {opt.recommended_recipe.process_parameters?.temperature} °C · Time {opt.recommended_recipe.process_parameters?.time_minutes} min</p>
                          <p className="text-[12.5px]">Liquor Ratio 1:{opt.recommended_recipe.process_parameters?.liquor_ratio} · pH {opt.recommended_recipe.process_parameters?.ph}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Cost & Score</p>
                          <p className="mt-1 text-[12.5px]">Estimated cost: <strong>{fmt(opt.recommended_recipe.estimated_cost)}</strong> <span className="text-on-surface-variant">(cost units; reference-price heuristic, not quoted prices)</span></p>
                          {opt.recommended_recipe.score && (
                            <div className="mt-2 space-y-1">
                              {([['Shade match', opt.recommended_recipe.score.components?.shade_score], ['Cost', opt.recommended_recipe.score.components?.cost_score], ['Feasibility', opt.recommended_recipe.score.components?.feasibility_score]] as any[]).map(([label, v]: any) => (
                                <div key={label}>
                                  <div className="flex justify-between text-[11.5px]"><span>{label}</span><span className="font-mono-data">{fmt(v, 3)}</span></div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(Number(v || 0) * 100)}%` }} /></div>
                                </div>
                              ))}
                              <p className="text-[11.5px] text-on-surface-variant">Total {fmt(opt.recommended_recipe.score.total_score, 4)} · {opt.recommended_recipe.score.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : <p className="text-[13px] text-on-surface-variant">No feasible recipe found with the given constraints.</p>}

                  {(opt.warnings || []).length > 0 && (
                    <div>
                      <h4 className="text-[13px] font-semibold text-amber-800">Compatibility Check — Warnings</h4>
                      <ul className="mt-1 space-y-1">
                        {(opt.warnings || []).slice(0, 8).map((w: any, i: number) => (
                          <li key={i} className="rounded-md bg-amber-50 p-2 text-[12px] text-amber-800">⚠ {w.candidate_id}: {(w.violations || []).map((v: any) => v.message).join('; ')}</li>
                        ))}
                      </ul>
                      {(opt.warnings || []).length > 8 && <p className="mt-1 text-[11.5px] text-on-surface-variant">+ {(opt.warnings || []).length - 8} further candidate warnings.</p>}
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-100 p-3 text-[12px]">
                    <p className="font-semibold">Knowledge-Base Traceability</p>
                    <p className="text-on-surface-variant">Constraint evaluations: {(opt.constraint_evaluations || []).length} candidates screened · KB rules operate with human_validation_status = pending (advisory/prototype only — not validated industrial rules).</p>
                    {(opt.request_context?.warnings || []).length > 0 && (
                      <ul className="mt-1 list-disc pl-5 text-on-surface-variant">{opt.request_context.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
                    )}
                    {opt.request_context?.resource_source && <p className="mt-1 text-on-surface-variant">Resources transcribed from {opt.request_context.resource_source.recipe_id} (reference data; live inventory unavailable).</p>}
                  </div>

                  <p className="text-[12px] text-on-surface-variant">{opt.notes} {opt.delta_e_note}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
