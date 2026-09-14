// AI Dye Optimization — Input Validator
// Accepts the structured textile request envelope:
//
//   { material: { fabric_id, fabric_type?, fiber_composition[{fiber,percentage}],
//                weight_kg, gsm },
//     target_shade: { L, a, b, color_space?, shade_depth },
//     dye_class, machine: { machine_id } | machine_id?,
//     process: { liquor_ratio, temperature_c, time_minutes, ph } |
//     process_constraints (legacy), optimization_preferences?, ... }
//
// and the legacy flat shape (fiber_composition[], fabric_type, fabric_weight_kg,
// gsm, target_lab, shade_depth, dye_class, machine_id?, process_constraints?).
//
// Reference-backed checks (fabric/dye/machine) use textileReference.js, derived
// from standard recipes + KB. Machine operating limits come from KB machine
// records. No invented thresholds: Delta-E interpretation is reported as
// "threshold not configured".
//
// Returns { valid, errors[{code,message,field}], warnings[], normalized } where
// normalized is the legacy-shaped object the optimizer pipeline consumes.

const ref = require('./textileReference');

const KNOWN_FIBERS = () => ref.getFibers().map(f => f.name.toLowerCase());
const SHADE_DEPTHS = ['light', 'medium', 'dark'];

function err(code, message, field) {
  return { code, message, field };
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// "IF fabric_type == 'Cotton' THEN max_temperature = 98" (KB operating rules)
function fabricTempCaps(machineId) {
  const caps = {};
  try {
    const fs = require('fs');
    const kb = JSON.parse(fs.readFileSync('D:/SUSTUNO/mater_knowledge_base/master_knowledge_base.json', 'utf-8'));
    const machine = ref.getMachine(machineId);
    const label = machine && machine.label;
    for (const r of kb.knowledge_records || []) {
      if (r.domain !== 'machine' || r.property !== 'operating rule') continue;
      if (label && r.subject !== label) continue;
      const m = String(r.value || '').match(/IF\s+fabric_type\s*==\s*'([^']+)'\s*THEN\s*max_temperature\s*=\s*([\d.]+)/i);
      if (m) caps[m[1].toLowerCase()] = parseFloat(m[2]);
    }
  } catch { /* caps stay empty; no fabricated limits */ }
  return caps;
}

function validateOptimizationRequest(req) {
  const errors = [];
  const warnings = [];

  if (!req || typeof req !== 'object') {
    return { valid: false, errors: [err('EMPTY_REQUEST', 'Request body is required and must be an object.', '')], warnings, normalized: null };
  }

  const structured = !!(req.material || req.target_shade || req.process || req.machine);

  // ---------- MATERIAL ----------
  let fabricId = null;
  let fabric = null;
  let composition = null; // [{fiber, percentage|null}]
  let weightKg = null;
  let gsm = null;

  if (structured) {
    const mat = req.material || {};
    fabricId = mat.fabric_id || null;
    if (fabricId) {
      fabric = ref.getFabric(fabricId);
      if (!fabric) errors.push(err('UNKNOWN_FABRIC', `Unknown fabric_id '${fabricId}'. Select a validated fabric from /api/reference/fabrics.`, 'material.fabric_id'));
    }
    const fc = mat.fiber_composition;
    if (fc !== undefined && fc !== null) {
      const arr = Array.isArray(fc) ? fc : [fc];
      composition = [];
      const seen = new Set();
      arr.forEach((entry, i) => {
        const field = `material.fiber_composition[${i}]`;
        if (typeof entry === 'string') {
          errors.push(err('INVALID_FIBER_ENTRY', 'Fiber entries must be objects {fiber, percentage}.', field));
          return;
        }
        if (!entry || typeof entry !== 'object') {
          errors.push(err('INVALID_FIBER_ENTRY', 'Fiber entry must be an object {fiber, percentage}.', field));
          return;
        }
        const name = String(entry.fiber || entry.fiber_type || '').trim();
        const pct = entry.percentage;
        if (!name) {
          errors.push(err('MISSING_FIBER_NAME', 'Fiber name is required.', field + '.fiber'));
        } else if (!KNOWN_FIBERS().includes(name.toLowerCase())) {
          errors.push(err('UNKNOWN_FIBER', `Unknown fiber '${name}'. Validated fibers: ${ref.getFibers().map(f => f.name).join(', ')}.`, field + '.fiber'));
        } else if (seen.has(name.toLowerCase())) {
          errors.push(err('DUPLICATE_FIBER', `Duplicate fiber entry '${name}'.`, field + '.fiber'));
        } else {
          seen.add(name.toLowerCase());
        }
        if (pct === undefined || pct === null || !isNum(pct)) {
          errors.push(err('INVALID_FIBER_PERCENTAGE', 'Percentage must be a number.', field + '.percentage'));
        } else if (pct < 0 || pct > 100) {
          errors.push(err('INVALID_FIBER_PERCENTAGE', 'Percentage must be between 0 and 100.', field + '.percentage'));
        }
        composition.push({ fiber: name || null, percentage: isNum(pct) ? pct : null });
      });
      if (!arr.length) errors.push(err('EMPTY_COMPOSITION', 'At least one fiber is required.', 'material.fiber_composition'));
      const nums = composition.filter(c => isNum(c.percentage));
      if (nums.length === arr.length && arr.length > 0) {
        const total = nums.reduce((s, c) => s + c.percentage, 0);
        if (Math.abs(total - 100) > 0.01) {
          errors.push(err('INVALID_FIBER_COMPOSITION', `Fiber composition must total 100%. Current total: ${+total.toFixed(2)}%.`, 'material.fiber_composition'));
        }
      }
    } else if (fabric) {
      // No explicit composition: adopt the fabric's authoritative definition.
      composition = fabric.composition.map(c => ({ ...c }));
    } else {
      errors.push(err('MISSING_COMPOSITION', 'fiber_composition is required (array of {fiber, percentage} totaling 100%).', 'material.fiber_composition'));
    }
    weightKg = mat.weight_kg;
    gsm = mat.gsm;
  } else {
    // ---------- legacy flat shape ----------
    const fc = req.fiber_composition;
    if (fc === undefined || !Array.isArray(fc) || fc.length === 0) {
      errors.push(err('MISSING_COMPOSITION', 'fiber_composition is required and must be a non-empty array.', 'fiber_composition'));
    } else {
      composition = fc.map(entry => (typeof entry === 'string'
        ? { fiber: entry, percentage: null }
        : { fiber: (entry && (entry.fiber || entry.fiber_type)) || null, percentage: (entry && entry.percentage) ?? null }));
    }
    if (!req.fabric_type || typeof req.fabric_type !== 'string' || !req.fabric_type.trim()) {
      errors.push(err('MISSING_FABRIC', 'fabric_type is required (string).', 'fabric_type'));
    }
    weightKg = req.fabric_weight_kg;
    gsm = req.gsm;
  }

  const fabricType = (fabric && fabric.full_description) || req.fabric_type || (structured ? (req.material || {}).fabric_type : null) || null;
  if (structured && !fabricId && (!fabricType || !String(fabricType).trim())) {
    errors.push(err('MISSING_FABRIC', 'material.fabric_id or material.fabric_type is required.', 'material.fabric_id'));
  }

  if (weightKg === undefined || weightKg === null || !isNum(weightKg) || weightKg <= 0) {
    errors.push(err('INVALID_WEIGHT', 'Fabric weight must be a positive number (kg).', structured ? 'material.weight_kg' : 'fabric_weight_kg'));
  } else if (weightKg > 2000) {
    warnings.push('Fabric weight exceeds the typical configured range (50–2000 kg).');
  }
  if (gsm === undefined || gsm === null || !isNum(gsm) || gsm <= 0) {
    errors.push(err('INVALID_GSM', 'GSM must be a positive number.', structured ? 'material.gsm' : 'gsm'));
  } else if (gsm < 50 || gsm > 800) {
    warnings.push('GSM is outside the typical configured range (50–800 GSM).');
  }

  // ---------- TARGET SHADE ----------
  const shade = req.target_shade || req.target_lab || null;
  let L = null, A = null, B = null, shadeDepth = null;
  if (!shade || typeof shade !== 'object') {
    errors.push(err('MISSING_SHADE', 'Target shade is required (object with L, a, b).', structured ? 'target_shade' : 'target_lab'));
  } else {
    L = shade.L; A = shade.a; B = shade.b;
    if (!isNum(L) || L < 0 || L > 100) errors.push(err('INVALID_L', 'Target L* must be a number in range 0–100.', (structured ? 'target_shade' : 'target_lab') + '.L'));
    if (!isNum(A) || A < -128 || A > 127) errors.push(err('INVALID_A', 'Target a* must be a number in range -128–127.', (structured ? 'target_shade' : 'target_lab') + '.a'));
    if (!isNum(B) || B < -128 || B > 127) errors.push(err('INVALID_B', 'Target b* must be a number in range -128–127.', (structured ? 'target_shade' : 'target_lab') + '.b'));
    const sd = shade.shade_depth ?? req.shade_depth ?? null;
    if (!sd || typeof sd !== 'string' || !SHADE_DEPTHS.includes(sd.toLowerCase())) {
      errors.push(err('INVALID_SHADE_DEPTH', 'shade_depth is required: Light, Medium or Dark.', (structured ? 'target_shade' : '') + '.shade_depth'));
    } else {
      shadeDepth = sd.charAt(0).toUpperCase() + sd.slice(1).toLowerCase();
    }
  }

  // ---------- DYE CLASS ----------
  const dyeClass = req.dye_class;
  if (!dyeClass || typeof dyeClass !== 'string' || !dyeClass.trim()) {
    errors.push(err('MISSING_DYE_CLASS', 'dye_class is required.', 'dye_class'));
  } else if (fabric) {
    const ok = fabric.dye_classes.some(dc => dc.toLowerCase() === dyeClass.trim().toLowerCase());
    if (!ok) {
      errors.push(err('INCOMPATIBLE_DYE_CLASS', `Dye class '${dyeClass}' is not validated for fabric '${fabric.name}'. Validated options: ${fabric.dye_classes.join(', ') || 'none'}.`, 'dye_class'));
    }
  }

  // ---------- MACHINE ----------
  const machineId = (req.machine && (req.machine.machine_id || req.machine)) || req.machine_id || null;
  let machine = null;
  if (machineId) {
    machine = ref.getMachine(String(machineId));
    if (!machine) errors.push(err('UNKNOWN_MACHINE', `Unknown machine_id '${machineId}'. Select a validated machine from /api/reference/machines.`, 'machine.machine_id'));
  }

  // ---------- PROCESS ----------
  // Structured mode: temperature and pH are always required; liquor ratio and
  // time may be null ONLY for continuous lines (padding/dwell regimes), where
  // they are genuinely not applicable.
  const proc = req.process || null;
  const pc = req.process_constraints || {};
  const continuousLine = !!(machine && machine.continuous);
  let liquor = null, temp = null, timeMin = null, ph = null;
  if (structured) {
    if (!proc || typeof proc !== 'object') {
      errors.push(err('MISSING_PROCESS', 'process is required (liquor_ratio, temperature_c, time_minutes, ph).', 'process'));
    } else {
      liquor = proc.liquor_ratio ?? null;
      temp = proc.temperature_c ?? proc.temperature ?? null;
      timeMin = proc.time_minutes ?? proc.time ?? null;
      ph = proc.ph ?? null;
      if (liquor === null || liquor === undefined) {
        if (!continuousLine) errors.push(err('MISSING_LIQUOR_RATIO', 'process.liquor_ratio is required (null allowed only for continuous lines).', 'process.liquor_ratio'));
      } else if (!isNum(liquor) || liquor <= 0) {
        errors.push(err('INVALID_LIQUOR_RATIO', 'process.liquor_ratio must be a positive number (liquor parts per 1 part fabric).', 'process.liquor_ratio'));
      }
      if (!isNum(temp)) errors.push(err('INVALID_TEMPERATURE', 'process.temperature_c must be a number (°C).', 'process.temperature_c'));
      if (timeMin === null || timeMin === undefined) {
        if (!continuousLine) errors.push(err('MISSING_TIME', 'process.time_minutes is required (null allowed only for continuous lines).', 'process.time_minutes'));
      } else if (!isNum(timeMin) || timeMin <= 0 || timeMin > 1440) {
        errors.push(err('INVALID_TIME', 'process.time_minutes must be a number in range 1–1440.', 'process.time_minutes'));
      }
      if (!isNum(ph) || ph < 0 || ph > 14) errors.push(err('INVALID_PH', 'process.ph must be a number in range 0–14.', 'process.ph'));
    }
  } else {
    if (pc.liquor_ratio !== undefined && pc.liquor_ratio !== null && (!isNum(pc.liquor_ratio) || pc.liquor_ratio <= 0)) {
      errors.push(err('INVALID_LIQUOR_RATIO', 'process_constraints.liquor_ratio must be a positive number if provided.', 'process_constraints.liquor_ratio'));
    }
    for (const k of ['temperature_min', 'temperature_max', 'time_min', 'time_max', 'ph_min', 'ph_max']) {
      if (pc[k] !== undefined && pc[k] !== null && !isNum(pc[k])) {
        errors.push(err('INVALID_PROCESS_PARAM', `process_constraints.${k} must be a number if provided.`, `process_constraints.${k}`));
      }
    }
    if (isNum(pc.temperature_min) && isNum(pc.temperature_max) && pc.temperature_min > pc.temperature_max) {
      errors.push(err('INVALID_PROCESS_RANGE', 'temperature_min must not exceed temperature_max.', 'process_constraints'));
    }
    if (isNum(pc.time_min) && isNum(pc.time_max) && pc.time_min > pc.time_max) {
      errors.push(err('INVALID_PROCESS_RANGE', 'time_min must not exceed time_max.', 'process_constraints'));
    }
    if (isNum(pc.ph_min) && isNum(pc.ph_max) && pc.ph_min > pc.ph_max) {
      errors.push(err('INVALID_PROCESS_RANGE', 'ph_min must not exceed ph_max.', 'process_constraints'));
    }
    liquor = pc.liquor_ratio ?? null;
    temp = pc.temperature_max ?? pc.temperature_min ?? null;
  }

  // ---------- MACHINE CONSTRAINT CHECKS (KB-backed, only when machine known) ----------
  if (machine && errors.length === 0) {
    if (!machine.continuous) {
      if (isNum(weightKg)) {
        if (isNum(machine.min_batch_kg) && weightKg < machine.min_batch_kg) {
          errors.push(err('MACHINE_MIN_LOAD', `Batch weight ${weightKg} kg is below ${machine.label} minimum load (${machine.min_batch_kg} kg).`, 'material.weight_kg'));
        }
        if (isNum(machine.max_batch_kg) && weightKg > machine.max_batch_kg) {
          errors.push(err('MACHINE_OVERLOAD', `Batch weight ${weightKg} kg exceeds ${machine.label} rated capacity (${machine.max_batch_kg} kg).`, 'material.weight_kg'));
        }
      }
    }
    if (isNum(temp) && isNum(machine.max_temperature_c) && temp > machine.max_temperature_c) {
      errors.push(err('MACHINE_TEMP_LIMIT', `Temperature ${temp}°C exceeds ${machine.label} validated maximum (${machine.max_temperature_c}°C).`, 'process.temperature_c'));
    }
    if (isNum(liquor) && isNum(machine.liquor_ratio_min) && isNum(machine.liquor_ratio_max) &&
        (liquor < machine.liquor_ratio_min || liquor > machine.liquor_ratio_max)) {
      errors.push(err('MACHINE_LIQUOR_LIMIT', `Liquor ratio 1:${liquor} is outside ${machine.label} validated range (1:${machine.liquor_ratio_min}–1:${machine.liquor_ratio_max}).`, 'process.liquor_ratio'));
    }
    if (isNum(gsm) && isNum(machine.gsm_min) && gsm < machine.gsm_min) {
      errors.push(err('MACHINE_GSM_LIMIT', `GSM ${gsm} is below ${machine.label} validated minimum (${machine.gsm_min} GSM).`, 'material.gsm'));
    }
    if (fabric) {
      if (machine.woven_only && fabric.construction === 'Knit') {
        errors.push(err('MACHINE_FABRIC_LIMIT', `${machine.label} processes woven fabrics only; selected fabric construction is Knit.`, 'material.fabric_id'));
      }
      if (machine.no_knit && fabric.construction === 'Knit') {
        errors.push(err('MACHINE_FABRIC_LIMIT', `${machine.label} is not validated for knit fabrics.`, 'material.fabric_id'));
      }
      // KB fabric-specific temperature caps (e.g. TECWIN: cotton 98°C, polyester 130°C)
      const caps = fabricTempCaps(machine.id);
      const compFibers = (composition || []).map(c => String(c.fiber || '').toLowerCase());
      for (const [fb, cap] of Object.entries(caps)) {
        if (isNum(temp) && temp > cap && compFibers.some(f => f.includes(fb) || fb.includes(f))) {
          errors.push(err('MACHINE_TEMP_LIMIT', `Temperature ${temp}°C exceeds the KB operating-rule cap for ${fb} on ${machine.label} (${cap}°C).`, 'process.temperature_c'));
        }
      }
    }
  }

  // ---------- PREFERENCES ----------
  const pref = req.optimization_preferences || {};
  for (const k of ['shade_weight', 'cost_weight', 'water_weight', 'feasibility_weight']) {
    if (pref[k] !== undefined && (!isNum(pref[k]) || pref[k] < 0)) {
      errors.push(err('INVALID_PREFERENCE', `optimization_preferences.${k} must be a non-negative number.`, `optimization_preferences.${k}`));
    }
  }

  const valid = errors.length === 0;
  let normalized = null;
  if (valid) {
    const compStrings = (composition || []).map(c => c.fiber).filter(Boolean);
    const procConstraints = structured
      ? { liquor_ratio: liquor ?? undefined, temperature_min: temp ?? undefined, temperature_max: temp ?? undefined, time_min: timeMin ?? undefined, time_max: timeMin ?? undefined, ph_min: ph ?? undefined, ph_max: ph ?? undefined }
      : { ...(req.process_constraints || {}) };
    normalized = {
      fiber_composition: compStrings.length ? compStrings : (req.fiber_composition || []),
      fiber_composition_structured: (composition || []).filter(c => c.fiber),
      fabric_type: fabricType,
      fabric_id: fabricId,
      fabric_weight_kg: weightKg,
      gsm,
      target_lab: { L, a: A, b: B },
      shade_depth: shadeDepth,
      dye_class: String(dyeClass).trim(),
      machine_id: machine ? machine.id : (machineId ? String(machineId) : null),
      available_dyes: req.available_dyes,
      available_chemicals: req.available_chemicals,
      process_constraints: procConstraints,
      optimization_preferences: Object.keys(pref).length ? pref : undefined,
    };
    // Inventory-aware defaults: transcribe recipe resources when caller did not supply any.
    if ((!normalized.available_dyes || !normalized.available_chemicals) && fabric && fabric.recipe_id) {
      const res = ref.getRecipeResources(fabric.recipe_id);
      if (res) {
        if (!normalized.available_dyes) normalized.available_dyes = res.dyes.map(d => d.name);
        if (!normalized.available_chemicals) normalized.available_chemicals = res.chemicals.map(c => c.name);
        normalized.resource_source = { recipe_id: fabric.recipe_id, inventory_status: res.inventory_status, note: res.note };
      }
    }
    if (!normalized.available_dyes && !normalized.available_chemicals) {
      normalized.inventory_status = 'unavailable';
    }
  }
  return { valid, errors, warnings, normalized };
}

module.exports = { validateOptimizationRequest };
