// Textile Reference Data Service
// Single source of structured textile reference data for the Dye Optimizer UI.
// Values are DERIVED at runtime from existing project data — nothing is invented:
//   - Fabrics / fibers / dye classes / recipe resources: Standard_Recipes_Master_Dataset.json
//   - Machines + operating limits: master_knowledge_base.json (machine domain records)
// If a source file is unreadable, the corresponding list is empty (honest empty
// state) rather than fabricated. No database tables are created; no IoT; no RAG.

const fs = require('fs');
const path = require('path');

const RECIPES_FILE = 'D:/SUSTUNO/AI Training dataset/JSON_Files/Standard_Recipes_Master_Dataset.json';
const KB_MASTER = 'D:/SUSTUNO/mater_knowledge_base/master_knowledge_base.json';

let cache = null;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function loadSources() {
  if (cache) return cache;
  const parsed = readJson(RECIPES_FILE);
  const recipes = Array.isArray(parsed) ? parsed : ((parsed && parsed.recipes) || []);
  const kbParsed = readJson(KB_MASTER);
  const kbRecords = (kbParsed && kbParsed.knowledge_records) || [];
  cache = { recipes, kbRecords };
  return cache;
}

// Canonical fiber names. The alias map normalizes spelling variants found in
// project data (e.g. "Nylon 6,6", "Lycra", "Elastane"); canonical names are the
// ones used across Standard_Recipes + KB applicability fiber lists.
const FIBER_ALIASES = [
  [/nylon\s*6[,.]?\s*6?/i, 'Nylon 6,6'],
  [/cotton/i, 'Cotton'],
  [/polyester/i, 'Polyester'],
  [/spandex|lycra|elastane/i, 'Spandex'],
  [/wool/i, 'Wool'],
];

function canonicalFiber(raw) {
  const s = String(raw || '').trim();
  for (const [re, name] of FIBER_ALIASES) {
    if (re.test(s)) return name;
  }
  return s;
}

// "65% Polyester / 35% Cotton Woven Twill" -> composition [{Polyester,65},{Cotton,35}]
// A segment ends at the next "/" or end of string; the fiber token is the
// canonical fiber stem inside the segment (construction words stay out).
function parseComposition(fabricType) {
  const composition = [];
  const re = /(\d+(?:\.\d+)?)\s*%\s*([^/]+?)(?=\s*\/|\s*$)/g;
  let m;
  let lastIndex = 0;
  while ((m = re.exec(fabricType || '')) !== null) {
    if (m.index === lastIndex && m[0].length === 0) break;
    const fiber = canonicalFiber(m[2]);
    if (fiber) composition.push({ fiber, percentage: parseFloat(m[1]) });
    lastIndex = m.index + m[0].length;
  }
  const rest = (fabricType || '').slice(lastIndex).replace(/^[\s/,-]+/, '').trim();
  return { composition, remainder: rest };
}

function detectConstruction(fabricType, remainder) {
  const s = `${fabricType || ''} ${remainder || ''}`.toLowerCase();
  if (/\bknit\b|\bjersey\b|\binterlock\b|\bwarp knit\b/.test(s)) return 'Knit';
  if (/\bwoven\b|\bcanvas\b|\btwill\b|\bdenim\b/.test(s)) return 'Woven';
  if (/\byarn\b|\bpackage\b/.test(s)) return 'Yarn';
  return 'Unknown';
}

// Short display name: strip leading "NN% Fiber" and inner "/ NN% Fiber" segments,
// e.g. "100% Cotton Single Jersey Knit" -> "Single Jersey Knit",
// "65% Polyester / 35% Cotton Woven Twill" -> "Woven Twill".
// Composition itself is shown separately in the UI, so it is safe to drop here.
const FIBER_TOKEN = '(?:cotton|polyester|nylon(?:\\s*6[,.]?\\s*6?)?|spandex|lycra|elastane|wool)';
function shortName(fullDescription) {
  let s = String(fullDescription || '')
    .replace(new RegExp('^\\s*\\d+(?:\\.\\d+)?\\s*%\\s*' + FIBER_TOKEN + '\\b\\s*', 'i'), '')
    .replace(new RegExp('\\s*/\\s*\\d+(?:\\.\\d+)?\\s*%\\s*' + FIBER_TOKEN + '\\b', 'gi'), '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .replace(/^\/\s*/, '')
    .trim();
  return s || fullDescription;
}

// Map verbose recipe dye_type strings to canonical short labels (presentation
// labels only; the mapping table below is documented and recipe-grounded).
function dyeLabels(dyeType) {
  const t = (dyeType || '').toLowerCase();
  const hasReactive = t.includes('reactive');
  const hasDisperse = t.includes('disperse');
  const hasAcid = t.includes('acid') || t.includes('metal complex');
  const hasVat = t.includes('vat');
  if (hasDisperse && hasReactive) return ['Disperse + Reactive'];
  if (hasReactive) return ['Reactive'];
  if (hasDisperse) return ['Disperse'];
  if (hasAcid) return ['Acid'];
  if (hasVat) return ['Vat'];
  return [];
}

function parseDyes(dyeName) {
  const out = [];
  const re = /([A-Za-z][A-Za-z0-9 .\-/()]+?)\s*\(\s*([\d.]+)\s*%\s*owf\s*\)/g;
  let m;
  while ((m = re.exec(dyeName || '')) !== null) out.push({ name: m[1].trim(), pct_owf: parseFloat(m[2]) });
  return out;
}

function getFabrics() {
  const { recipes } = loadSources();
  return recipes.map((r, idx) => {
    const b = r.basic_information || {};
    const d = r.dye_information || {};
    const { composition, remainder } = parseComposition(b.fabric_type || '');
    const construction = detectConstruction(b.fabric_type, remainder);
    const gsmNum = parseInt(String(b.fabric_gsm || ''), 10);
    const wtNum = parseFloat(String(b.fabric_weight || ''));
    return {
      id: `FAB-${String(idx + 1).padStart(3, '0')}`,
      name: shortName(b.fabric_type),
      full_description: b.fabric_type || null,
      construction,
      composition,
      gsm_reference: Number.isFinite(gsmNum) ? gsmNum : null,
      weight_reference_kg: Number.isFinite(wtNum) ? wtNum : null,
      dye_classes: dyeLabels(d.dye_type),
      shade_name: b.shade_name || null,
      shade_depth: b.shade_depth || null,
      recipe_id: b.recipe_id || null,
      recipe_name: b.recipe_name || null,
      reference_machine: (r.machine_requirement && r.machine_requirement.machine_type) || null,
      source: 'Standard_Recipes_Master_Dataset.json',
    };
  });
}

function getFibers() {
  const fibers = new Map();
  for (const f of getFabrics()) {
    for (const c of f.composition) {
      if (!c.fiber) continue;
      if (!fibers.has(c.fiber)) fibers.set(c.fiber, { id: `FIB-${fibers.size + 1}`, name: c.fiber, source_recipe_ids: [] });
      if (f.recipe_id && !fibers.get(c.fiber).source_recipe_ids.includes(f.recipe_id)) {
        fibers.get(c.fiber).source_recipe_ids.push(f.recipe_id);
      }
    }
  }
  return [...fibers.values()];
}

function getDyeClasses(fabricId) {
  const labels = new Map(); // label -> {label, source_recipe_ids}
  const fabrics = getFabrics().filter(f => !fabricId || f.id === fabricId);
  for (const f of fabrics) {
    for (const label of f.dye_classes) {
      if (!labels.has(label)) labels.set(label, { label, source_recipe_ids: [] });
      if (f.recipe_id) labels.get(label).source_recipe_ids.push(f.recipe_id);
    }
  }
  return [...labels.values()];
}

function getRecipeResources(recipeId) {
  const { recipes } = loadSources();
  const r = recipes.find(x => (x.basic_information || {}).recipe_id === recipeId);
  if (!r) return null;
  const d = r.dye_information || {};
  const chems = (r.chemical_information || []).map(c => ({ name: c.chemical_name || null, dosage: c.dosage || null }));
  return {
    recipe_id: recipeId,
    dyes: parseDyes(d.dye_name),
    dye_type: d.dye_type || null,
    chemicals: chems,
    inventory_status: 'reference',
    note: 'Resources transcribed from the validated standard recipe. No live inventory tables exist; stock availability is not checked.',
  };
}

// ---- Machines (from KB machine-domain records) ----

function kbBySubjectProp(kbRecords, subject, property) {
  return kbRecords.find(r =>
    r.domain === 'machine' &&
    (r.subject || '') === subject &&
    (r.property || '') === property);
}

function numField(rec, field) {
  if (!rec) return null;
  const v = rec[field];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseLiquorRange(text) {
  // "Minimum 1:5 | Maximum 1:10" or "1:6 to 1:9 MLR" or "1:3 to 1:5 MLR"
  const nums = [...String(text || '').matchAll(/1\s*:\s*([\d.]+)/g)].map(m => parseFloat(m[1]));
  if (nums.length >= 2) {
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    // "Minimum 1:5 | Maximum 1:10": first number is the min ratio denominator
    if (/minimum/i.test(String(text))) return { min: nums[0], max: nums[1] };
    return { min: lo, max: hi };
  }
  return { min: null, max: null };
}

function machineShortId(subject) {
  const m = String(subject || '').match(/\(([A-Za-z0-9][A-Za-z0-9 \-]+)\)/);
  return m ? m[1].trim().replace(/\s+/g, '-') : String(subject || '').slice(0, 24);
}

function getMachines() {
  const { kbRecords } = loadSources();
  const subjects = [];
  for (const r of kbRecords) {
    if (r.domain === 'machine' && r.knowledge_type === 'fact' && r.subject && !subjects.includes(r.subject)) {
      subjects.push(r.subject);
    }
  }
  return subjects.map(subject => {
    const maxBatch = kbBySubjectProp(kbRecords, subject, 'maximum batch size');
    const minBatch = kbBySubjectProp(kbRecords, subject, 'minimum batch size');
    const maxTemp = kbBySubjectProp(kbRecords, subject, 'maximum temperature');
    const liquor = kbBySubjectProp(kbRecords, subject, 'liquor_ratio_limits');
    const fabricRestr = kbBySubjectProp(kbRecords, subject, 'fabric_restrictions');
    const tempRestr = kbBySubjectProp(kbRecords, subject, 'temperature_restrictions');
    const lr = parseLiquorRange(liquor && liquor.value);
    const frText = (fabricRestr && fabricRestr.value) || '';
    const kbIds = kbRecords
      .filter(r => r.domain === 'machine' && r.subject === subject)
      .map(r => r.knowledge_id)
      .filter(Boolean);
    const continuous = /continuous/i.test(subject);
    return {
      id: machineShortId(subject),
      label: subject,
      type: ((kbRecords.find(r => r.domain === 'machine' && r.subject === subject && r.applicability && (r.applicability.machine_type || []).length) || {}).applicability || {}).machine_type?.[0] || null,
      continuous,
      min_batch_kg: continuous ? null : (numField(minBatch, 'minimum') ?? numField(minBatch, 'maximum')),
      max_batch_kg: continuous ? null : (numField(maxBatch, 'maximum') ?? numField(maxBatch, 'minimum')),
      max_temperature_c: numField(maxTemp, 'maximum') ?? numField(maxTemp, 'minimum'),
      liquor_ratio_min: lr.min,
      liquor_ratio_max: lr.max,
      gsm_min: /must be >\s*(\d+)\s*gsm/i.test(frText) ? parseInt(frText.match(/must be >\s*(\d+)\s*gsm/i)[1], 10) : null,
      woven_only: /woven fabrics only|open-width woven/i.test(frText),
      no_knit: /no knit/i.test(frText),
      fabric_restrictions: frText || null,
      temperature_restrictions: (tempRestr && tempRestr.value) || null,
      kb_ids: kbIds,
      source: 'master_knowledge_base.json (machine domain)',
    };
  });
}

function getMachine(machineId) {
  return getMachines().find(m => m.id === machineId) || null;
}

// ---- Process defaults transcribed from a standard recipe's process_parameters.
// Returns {liquor_ratio, temperature_c, time_minutes, ph} with null where the
// recipe does not define a parseable value (e.g. continuous padding has no
// liquor ratio), plus derivation notes. Values are suggestions, not commands.
function getProcessDefaults(recipeId) {
  const { recipes } = loadSources();
  const r = recipes.find(x => (x.basic_information || {}).recipe_id === recipeId);
  if (!r) return null;
  const p = r.process_parameters || {};
  const notes = [];

  let liquor = null;
  const lrMatch = String(p.liquor_ratio || '').match(/1\s*:\s*([\d.]+)/);
  if (lrMatch) liquor = parseFloat(lrMatch[1]);
  else notes.push('Recipe uses continuous padding (no liquor ratio); liquor ratio left unset.');

  let temperature = null;
  const profile = String(p.temperature_profile || '');
  const heatTos = [...profile.matchAll(/Heat to\s*([\d.]+)/gi)].map(m => parseFloat(m[1]));
  const arrows = [...profile.matchAll(/->\s*([\d.]+)\s*°C\s*@/g)].map(m => parseFloat(m[1]));
  const pool = heatTos.length ? heatTos : arrows;
  if (pool.length) {
    temperature = Math.max(...pool);
    notes.push(`Peak dyeing temperature transcribed from recipe temperature profile (${heatTos.length ? 'Heat-to step' : 'ramp step'}).`);
  } else {
    notes.push('No parseable dyeing temperature in recipe profile; temperature left unset.');
  }

  let timeMin = null;
  const timeMatch = String(p.time || '').match(/Total Duration:\s*([\d.]+)\s*minutes/i);
  if (timeMatch) timeMin = parseFloat(timeMatch[1]);
  else notes.push('No total-duration in recipe; process time left unset (continuous line uses dwell/speed).');

  let ph = null;
  const phText = String(p.ph || '');
  const phPatterns = [
    /Fixation pH:\s*([\d.]+)\s*-\s*([\d.]+)/i,
    /Dyeing pH:\s*([\d.]+)\s*-\s*([\d.]+)/i,
    /Stage 1 pH:\s*([\d.]+)\s*-\s*([\d.]+)/i,
    /Reduction[^|]*?pH:\s*([\d.]+)(?:\s*-\s*([\d.]+))?/i,
    /([\d.]+)\s*-\s*([\d.]+)/,
  ];
  for (const re of phPatterns) {
    const m = phText.match(re);
    if (m) {
      const lo = parseFloat(m[1]);
      const hi = m[2] !== undefined ? parseFloat(m[2]) : lo;
      ph = +(((lo + hi) / 2).toFixed(2));
      break;
    }
  }
  if (ph === null) {
    const single = phText.match(/pH:\s*([\d.]+)(?!\s*[-–])/i);
    if (single) ph = parseFloat(single[1]);
  }
  if (ph === null) notes.push('No parseable dyeing pH in recipe; pH left for manual entry.');
  else notes.push('Dyeing pH midpoint transcribed from recipe; adjust manually for the specific dye/chemical combo.');

  return {
    recipe_id: recipeId,
    liquor_ratio: liquor,
    temperature_c: temperature,
    time_minutes: timeMin,
    ph,
    derivation: notes,
    source: 'Standard_Recipes_Master_Dataset.json process_parameters',
  };
}

function getFabric(fabricId) {
  return getFabrics().find(f => f.id === fabricId) || null;
}

module.exports = {
  getFabrics, getFabric, getFibers, getDyeClasses, getMachines, getMachine,
  getRecipeResources, getProcessDefaults, parseComposition,
};
