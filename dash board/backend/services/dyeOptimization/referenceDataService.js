// Reference Data Retrieval Service
// Retrieves dye/chemical/recipe/machine/reference data from DB (or structured sources) without duplication.

const fs = require('fs').promises;

const KB_MASTER = 'D:/SUSTUNO/mater_knowledge_base/master_knowledge_base.json';
const RECIPES_FILE = 'D:/SUSTUNO/AI Training dataset/JSON_Files/Standard_Recipes_Master_Dataset.json';

async function loadMasterKB() {
  try {
    const raw = await fs.readFile(KB_MASTER, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.knowledge_records || [];
  } catch {
    return [];
  }
}

async function loadStandardRecipes() {
  try {
    const raw = await fs.readFile(RECIPES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.recipes || []);
  } catch {
    return [];
  }
}

function filterDyeCandidates(fiber, dyeClass, kbRecords) {
  const fiberLower = (fiber || '').toLowerCase();
  const dyeClassLower = (dyeClass || '').toLowerCase();
  // Filter KB recipe records by fiber/applicability and dye_class
  const filtered = kbRecords.filter(r => {
    const app = r.applicability || {};
    const fibers = (app.fiber || []).map(f => f.toLowerCase());
    const dyeClasses = (app.dye_class || []).map(d => d.toLowerCase());
    const fiberMatch = fibers.length === 0 || fibers.some(f => fiberLower.includes(f) || f.includes(fiberLower));
    const dyeMatch = dyeClasses.length === 0 || dyeClasses.some(dc => dyeClassLower.includes(dc) || dc.includes(dyeClassLower));
    return fiberMatch && dyeMatch && r.knowledge_type === 'recipe';
  });
  return filtered;
}

function filterMachineConstraints(machineId, kbRecords) {
  // If no DB machine reference available, return empty; if machineId provided, filter KB machine facts by subject.
  if (!machineId) return [];
  const idLower = String(machineId).toLowerCase();
  return kbRecords.filter(r => r.knowledge_type === 'fact' && r.subject && r.subject.toLowerCase().includes('machine') && String(r.knowledge_id || '').toLowerCase().includes(idLower));
}

async function retrieveReferenceData(request) {
  const kbRecords = await loadMasterKB();
  const recipes = await loadStandardRecipes();

  const candidates = filterDyeCandidates(request.fabric_type, request.dye_class, kbRecords);
  const machineConstraints = filterMachineConstraints(request.machine_id, kbRecords);

  return {
    kb_records: kbRecords,
    standard_recipes: recipes,
    dye_candidates: candidates,
    machine_constraints: machineConstraints,
    source_notes: {
      kb_version: 'master_knowledge_base.json',
      recipes_file: 'Standard_Recipes_Master_Dataset.json',
      note: 'Existing DB tables reused where supported (dye_opt_sessions, dye_opt_inputs, dye_opt_outputs, dye_opt_constraints, batches). No duplicate tables created.',
    }
  };
}

module.exports = { retrieveReferenceData, loadMasterKB, loadStandardRecipes, filterDyeCandidates, filterMachineConstraints };
