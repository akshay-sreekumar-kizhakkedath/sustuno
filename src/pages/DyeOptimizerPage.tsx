import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Button } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

import {
  fetchFabrics, fetchFibers, fetchDyeClasses, fetchMachines,
  fetchRecipeResources, fetchProcessDefaults, fetchWastewaterPrediction,
  runDyeOptimization,
} from '../services/apiClient';
import { useBatch } from '../context/BatchContext';
import { BatchWorkflowStepper } from '../components/workflow/BatchWorkflowStepper';


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
  const navigate = useNavigate();
  const { activeBatchId, activeBatch, confirmRecipe, startProduction, createBatch } = useBatch();
  const [confirming, setConfirming] = useState(false);

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
  // ---- process (auto-suggested from recipe, editable; per-field provenance) ----
  const [liquor, setLiquor] = useState<any>(8);
  const [temp, setTemp] = useState<any>(80);
  const [timeMin, setTimeMin] = useState<any>(60);
  const [ph, setPh] = useState<any>(7.5);
  const [autoProc, setAutoProc] = useState({ liquor: false, temp: false, time: false, ph: false });
  const [procNote, setProcNote] = useState<string | null>(null);

  // ---- resources / result / wastewater ----
  const [resources, setResources] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ww, setWw] = useState<any>(null);
  const [wwBusy, setWwBusy] = useState(false);


  const loadRefs = async () => {
    setRefsLoading(true);
    setRefsError(null);
    const [f, fi, m] = await Promise.all([fetchFabrics(), fetchFibers(), fetchMachines()]);
    const fails: string[] = [];
    if (!f) fails.push('fabrics');
    if (!fi) fails.push('fibers');
    if (!m) fails.push('machines');
    if (fails.length === 3) {
      setRefsError('Unable to connect to backend. Ensure the backend server is running on port 5000. Click retry to try again.');
    } else if (fails.length > 0) {
      setRefsError(`Partial data load failure: ${fails.join(', ')}. Some dropdowns may be empty. Click retry to try again.`);
    }
    setFabrics(f?.fabrics ?? []);
    setFibers(fi?.fibers ?? []);
    setMachines(m?.machines ?? []);
    setRefsLoading(false);
  };

  useEffect(() => {
    loadRefs();
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

  // ---- live process advisor: re-evaluates on EVERY input change ----
  // Fabric/machine/weight/GSM/composition/process edits instantly update
  // constraint checks + water preview. Fabric-specific temperature caps and
  // full KB rule screening still run authoritatively in backend validation.
  const advisor = useMemo(() => {
    const items: any[] = [];
    if (!machine) {
      items.push({ key: 'machine', tone: 'gray', text: 'Select a machine to validate process parameters.' });
      return items;
    }
    const w = Number(weightKg);
    if (!machine.continuous) {
      if (machine.min_batch_kg && machine.max_batch_kg) {
        const ok = w >= machine.min_batch_kg && w <= machine.max_batch_kg;
        items.push({ key: 'load', tone: ok ? 'green' : 'red', text: ok ? `Load ${w} kg within ${machine.min_batch_kg}–${machine.max_batch_kg} kg.` : `Load ${w} kg outside ${machine.min_batch_kg}–${machine.max_batch_kg} kg.` });
      }
    } else {
      items.push({ key: 'load', tone: 'gray', text: 'Continuous line — batch weighed in meters, kg load check not applicable.' });
    }
    const t = Number(temp);
    if (temp !== '' && machine.max_temperature_c) {
      const ok = t <= machine.max_temperature_c;
      items.push({ key: 'temp', tone: ok ? 'green' : 'red', text: ok ? `${t}°C within ${machine.label} maximum (${machine.max_temperature_c}°C).` : `${t}°C exceeds ${machine.label} maximum (${machine.max_temperature_c}°C).` });
    }
    const lr = Number(liquor);
    if (liquor !== '' && machine.liquor_ratio_min && machine.liquor_ratio_max) {
      const ok = lr >= machine.liquor_ratio_min && lr <= machine.liquor_ratio_max;
      items.push({ key: 'liquor', tone: ok ? 'green' : 'red', text: ok ? `Liquor 1:${lr} within 1:${machine.liquor_ratio_min}–1:${machine.liquor_ratio_max}.` : `Liquor 1:${lr} outside 1:${machine.liquor_ratio_min}–1:${machine.liquor_ratio_max}.` });
    }
    const g = Number(gsm);
    if (machine.gsm_min) {
      const ok = g >= machine.gsm_min;
      items.push({ key: 'gsm', tone: ok ? 'green' : 'red', text: ok ? `GSM ${g} meets minimum (${machine.gsm_min}).` : `GSM ${g} below minimum (${machine.gsm_min}) — rope collapse risk.` });
    }
    if (fabric && (machine.woven_only || machine.no_knit) && fabric.construction === 'Knit') {
      items.push({ key: 'constr', tone: 'red', text: `${machine.label} is not validated for knit construction.` });
    } else if (fabric) {
      items.push({ key: 'constr', tone: 'green', text: `Construction ${fabric.construction} compatible.` });
    }
    if (liquor !== '' && Number.isFinite(Number(weightKg))) {
      items.push({ key: 'water', tone: 'blue', text: `Dye-bath water ≈ ${(Number(liquor) * Number(weightKg)).toFixed(0)} L (${Number(liquor)} L/kg).` });
    }
    if (fabric) {
      items.push({ key: 'shade', tone: 'gray', text: `Shade ${shadeDepth} (L* ${L} a* ${A} b* ${B}) sets the color target for ΔE ranking; process follows ${fabric.recipe_id || 'recipe'} + machine limits.` });
    }
    return items;
  }, [machine, weightKg, temp, liquor, gsm, fabric, composition, shadeDepth, L, A, B]);

  function capToMachine(field: 'liquor' | 'temp', value: any, m: any): { value: any; capped: boolean; note: string } {
    if (!m || value === null || value === undefined || value === '') return { value, capped: false, note: '' };
    if (field === 'temp' && m.max_temperature_c && value > m.max_temperature_c) {
      return { value: m.max_temperature_c, capped: true, note: `Temperature capped to ${m.label} maximum (${m.max_temperature_c}°C).` };
    }
    if (field === 'liquor' && m.liquor_ratio_min && m.liquor_ratio_max && (value < m.liquor_ratio_min || value > m.liquor_ratio_max)) {
      const v = Math.min(Math.max(value, m.liquor_ratio_min), m.liquor_ratio_max);
      return { value: v, capped: true, note: `Liquor ratio adjusted into ${m.label} validated range (1:${m.liquor_ratio_min}–1:${m.liquor_ratio_max}).` };
    }
    return { value, capped: false, note: '' };
  }

  async function selectFabric(id: string) {
    setFabricId(id);
    setCustomComp(false);
    setProcNote(null);
    const f = fabrics.find((x) => x.id === id);
    if (f) {
      setComposition((f.composition || []).map((c: any) => ({ ...c })));
      if (f.gsm_reference) setGsm(f.gsm_reference);
      const dc = await fetchDyeClasses(id);
      const list = dc?.dye_classes ?? [];
      setDyeClasses(list);
      setDyeClass(list.length === 1 ? list[0].label : '');
      if (f.recipe_id) {
        setResources(await fetchRecipeResources(f.recipe_id));
        // Auto-suggest process parameters from the validated recipe.
        const pd = await fetchProcessDefaults(f.recipe_id);
        if (pd) {
          const flags: any = { liquor: false, temp: false, time: false, ph: false };
          const notes: string[] = [];
          if (pd.liquor_ratio !== null && pd.liquor_ratio !== undefined) {
            const c = capToMachine('liquor', pd.liquor_ratio, machine);
            setLiquor(c.value); flags.liquor = true;
            if (c.capped) notes.push(c.note);
          } else { setLiquor(''); }
          if (pd.temperature_c !== null && pd.temperature_c !== undefined) {
            const c = capToMachine('temp', pd.temperature_c, machine);
            setTemp(c.value); flags.temp = true;
            if (c.capped) notes.push(c.note);
          }
          if (pd.time_minutes !== null && pd.time_minutes !== undefined) { setTimeMin(pd.time_minutes); flags.time = true; }
          else { setTimeMin(''); }
          if (pd.ph !== null && pd.ph !== undefined) { setPh(pd.ph); flags.ph = true; }
          setAutoProc(flags);
          const derivation = (pd.derivation || []).join(' ');
          setProcNote(`Auto-filled from ${pd.recipe_id}. ${derivation} ${notes.join(' ')}`.trim());
        }
      } else {
        setResources(null);
      }
    } else {
      setComposition([]);
      setDyeClasses([]);
      setDyeClass('');
      setResources(null);
    }
  }

  function selectMachine(id: string) {
    setMachineId(id);
    const m = machines.find((x) => x.id === id);
    if (!m) return;
    // Re-apply machine caps to auto-suggested (non-overridden) fields only;
    // manually edited fields are left for backend validation to judge.
    const notes: string[] = [];
    if (autoProc.temp && temp !== '') {
      const c = capToMachine('temp', Number(temp), m);
      if (c.capped) { setTemp(c.value); notes.push(c.note); }
    }
    if (autoProc.liquor && liquor !== '') {
      const c = capToMachine('liquor', Number(liquor), m);
      if (c.capped) { setLiquor(c.value); notes.push(c.note); }
    }
    if (notes.length) setProcNote((p) => `${p ?? ''} ${notes.join(' ')}`.trim());
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
    setWw(null);
    if (!fabricId) { setFormError('Select a validated fabric before running optimization.'); return; }
    if (!compValid) { setFormError(`Fiber composition must total 100%. Current total: ${+compTotal.toFixed(2)}%.`); return; }
    if (!dyeClass) { setFormError('Select a dye class validated for this material.'); return; }
    if (!machineId) { setFormError('Select a validated machine before running optimization.'); return; }
    if (temp === '' || ph === '') { setFormError('Temperature and pH are required. Accept the auto-suggested values or enter them manually.'); return; }
    setRunning(true);
    try {
      const toNum = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));
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
        process: { liquor_ratio: toNum(liquor), temperature_c: Number(temp), time_minutes: toNum(timeMin), ph: Number(ph) },
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

  // Sync from active batch if present
  useEffect(() => {
    if (activeBatch && fabrics.length > 0) {
      if (activeBatch.material?.fabric_id && activeBatch.material.fabric_id !== fabricId) {
        selectFabric(activeBatch.material.fabric_id);
      }
      if (activeBatch.material?.weight_kg) setWeightKg(activeBatch.material.weight_kg);
      if (activeBatch.material?.gsm) setGsm(activeBatch.material.gsm);
      if (activeBatch.target_shade) {
        if (activeBatch.target_shade.L !== undefined) setL(activeBatch.target_shade.L);
        if (activeBatch.target_shade.a !== undefined) setA(activeBatch.target_shade.a);
        if (activeBatch.target_shade.b !== undefined) setB(activeBatch.target_shade.b);
      }
      if (activeBatch.dye_class) setDyeClass(activeBatch.dye_class);
      if (activeBatch.machine_id) setMachineId(activeBatch.machine_id);
      if (activeBatch.confirmed_recipe && !result) {
        setResult({
          success: true,
          optimization: {
            status: 'completed',
            model_tier: 'demo_synthetic',
            model_tier_message: `Displaying confirmed recipe for batch ${activeBatch.batch_id || activeBatchId}`,
            recommended_recipe: activeBatch.confirmed_recipe,
            target_lab: activeBatch.target_shade || { L, a: A, b: B },
          },
        });
      }
    }
  }, [activeBatch, fabrics]);

  async function handleConfirmAndStart() {
    if (!opt?.recommended_recipe) return;
    setConfirming(true);
    try {
      let targetBatchId = activeBatchId;
      if (!targetBatchId) {
        const bRes = await createBatch({
          material: {
            fabric_id: fabricId,
            fabric_type: fabric?.name || 'Cotton Single Jersey',
            fiber_composition: composition,
            weight_kg: Number(weightKg),
            gsm: Number(gsm),
          },
          target_shade: { L: Number(L), a: Number(A), b: Number(B), color_space: 'CIELAB', shade_depth: shadeDepth },
          dye_class: dyeClass,
          machine: { machine_id: machineId },
        });
        if (bRes && bRes.success && bRes.data) {
          targetBatchId = bRes.data.batch_id || bRes.data.id;
        }
      }
      if (!targetBatchId) {
        alert('Could not determine batch ID to confirm recipe.');
        return;
      }
      const confRes = await confirmRecipe(targetBatchId, opt.recommended_recipe);
      if (confRes && confRes.success) {
        await startProduction(targetBatchId, 'SUSTUNO-ESP32-001');
        navigate('/iot');
      } else {
        alert(confRes?.error?.message || 'Failed to confirm recipe');
      }
    } finally {
      setConfirming(false);
    }
  }

  async function predictWastewater() {

    if (!opt?.recommended_recipe) return;
    setWwBusy(true);
    setWw(null);
    try {
      const r = opt.recommended_recipe;
      const data = await fetchWastewaterPrediction({
        recipe: { dye_class: dyeClass, dyes: r.dyes, chemicals: r.chemicals, fabric_id: fabricId },
        process: r.process_parameters,
        batch: { fabric_weight_kg: Number(weightKg), gsm: Number(gsm), machine_id: machineId },
      });
      setWw(data);
    } finally {
      setWwBusy(false);
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

      <BatchWorkflowStepper />

      {refsLoading && <Card><p className="p-5 text-[13px] text-on-surface-variant">Loading fabric and reference data…</p></Card>}

      {refsError && <Card><div className="flex items-center justify-between gap-3 p-5"><p className="text-[13px] text-red-700">{refsError}</p><Button variant="secondary" onClick={() => loadRefs()}>Retry</Button></div></Card>}

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
                  <select value={machineId} onChange={(e) => selectMachine(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] outline-none">
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
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Liquor Ratio (1:X) {liquor !== '' && <Badge tone={autoProc.liquor ? 'blue' : 'gray'}>{autoProc.liquor ? 'Auto' : 'Manual'}</Badge>}</span>
                    <input type="number" min={1} value={liquor} onChange={(e) => { setLiquor(e.target.value === '' ? '' : Number(e.target.value)); setAutoProc((p) => ({ ...p, liquor: false })); }} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Temperature (°C) {temp !== '' && <Badge tone={autoProc.temp ? 'blue' : 'gray'}>{autoProc.temp ? 'Auto' : 'Manual'}</Badge>}</span>
                    <input type="number" value={temp} onChange={(e) => { setTemp(e.target.value === '' ? '' : Number(e.target.value)); setAutoProc((p) => ({ ...p, temp: false })); }} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">Time (min) {timeMin !== '' && <Badge tone={autoProc.time ? 'blue' : 'gray'}>{autoProc.time ? 'Auto' : 'Manual'}</Badge>}</span>
                    <input type="number" min={1} value={timeMin} onChange={(e) => { setTimeMin(e.target.value === '' ? '' : Number(e.target.value)); setAutoProc((p) => ({ ...p, time: false })); }} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                  <label className="block"><span className="mb-1 block text-[11.5px] font-semibold text-on-surface-variant">pH (0–14) {ph !== '' && <Badge tone={autoProc.ph ? 'blue' : 'gray'}>{autoProc.ph ? 'Auto' : 'Manual'}</Badge>}</span>
                    <input type="number" min={0} max={14} step={0.1} value={ph} onChange={(e) => { setPh(e.target.value === '' ? '' : Number(e.target.value)); setAutoProc((p) => ({ ...p, ph: false })); }} className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none" /></label>
                </div>
                {procNote && <p className="rounded-md bg-blue-50 p-2 text-[11.5px] text-blue-800">{procNote}</p>}
                <div className="rounded-lg border border-slate-100 p-2.5">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Live advisor — updates with every input</p>
                  <div className="space-y-1">
                    {advisor.map((a: any) => (
                      <p key={a.key} className="flex items-start gap-1.5 text-[12px]">
                        <Badge tone={a.tone === 'blue' ? 'blue' : a.tone === 'green' ? 'green' : a.tone === 'red' ? 'red' : 'gray'}>
                          {a.tone === 'green' ? '✓' : a.tone === 'red' ? '!' : '•'}
                        </Badge>
                        <span className="text-on-surface-variant">{a.text}</span>
                      </p>
                    ))}
                  </div>
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
                          {opt.recommended_recipe.estimated_water && (
                            <div className="mt-2 rounded-md bg-sky-50 p-2 text-[12.5px] text-sky-900">
                              <p><strong>Optimal process water (dye bath): </strong>
                                {opt.recommended_recipe.estimated_water.liquor_water_l !== null
                                  ? <><strong className="font-mono-data">{opt.recommended_recipe.estimated_water.liquor_water_l} L</strong> total · {opt.recommended_recipe.estimated_water.liquor_water_l_per_kg} L/kg</>
                                  : 'N/A — continuous padding reports pick-up %, not liquor ratio'}
                              </p>
                              {opt.recommended_recipe.estimated_water.kb_reference_band_l_per_kg && (
                                <p className="mt-0.5">KB machine reference (total process water): <strong className="font-mono-data">{opt.recommended_recipe.estimated_water.kb_reference_band_l_per_kg.min_l_per_kg}–{opt.recommended_recipe.estimated_water.kb_reference_band_l_per_kg.max_l_per_kg} L/kg</strong> ({opt.recommended_recipe.estimated_water.kb_reference_band_l_per_kg.knowledge_id})</p>
                              )}
                              <p className="mt-0.5 text-[11.5px] text-sky-700">{opt.recommended_recipe.estimated_water.scope_note}</p>
                            </div>
                          )}
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

                  {/* ============ RECIPE CONFIRMATION & PRODUCTION HANDOFF ============ */}
                  {opt.recommended_recipe && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-[14px] font-bold text-primary">Confirm Recipe & Launch Production</h4>
                            {activeBatch?.lifecycle_status === 'RECIPE_CONFIRMED' || activeBatch?.lifecycle_status === 'PRODUCTION_ACTIVE' ? (
                              <Badge tone="green">RECIPE CONFIRMED</Badge>
                            ) : (
                              <Badge tone="purple">ACTION REQUIRED</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] text-on-surface-variant">
                            Confirming saves this recipe to <strong>{activeBatchId || 'New Batch'}</strong>, automatically computes expected wastewater volume & parameters, and binds to active ESP32 IoT monitoring.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          icon="play_circle"
                          onClick={handleConfirmAndStart}
                          disabled={confirming}
                        >
                          {confirming ? 'Confirming...' : 'Confirm Recipe & Start IoT Production'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-100 p-3 text-[12.5px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Wastewater Handoff</p>
                      <Button variant="secondary" icon="water_drop" onClick={predictWastewater} disabled={wwBusy}>
                        {wwBusy ? 'Predicting…' : 'Predict wastewater for this recipe'}
                      </Button>
                    </div>

                    <p className="mt-1 text-[11.5px] text-on-surface-variant">Sends this recipe with its process parameters to wastewater prediction — no re-entry, so the profile stays consistent with the optimization.</p>
                    {ww && (
                      <div className="mt-2 rounded-md bg-slate-50 p-2 text-[12px]">
                        <p><strong>Prediction status:</strong> {ww.prediction_status}</p>
                        {ww.prediction_status === 'not_available'
                          ? <p className="text-on-surface-variant">Insufficient measured wastewater data for prediction.</p>
                          : <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                              {Object.entries(ww.predicted_profile || {}).map(([k, v]: any) => (
                                <p key={k}><span className="text-on-surface-variant">{k}:</span> <strong className="font-mono-data">{v === null || v === undefined ? 'N/A' : String(v)}</strong></p>
                              ))}
                            </div>}
                        {(ww.warnings || []).map((w: string, i: number) => <p key={i} className="text-amber-700">⚠ {w}</p>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
