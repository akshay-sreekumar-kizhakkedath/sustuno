// Candidate Recipe Generator
// Deterministic / reproducible. Uses reference recipes + bounded perturbation.
// Configurable candidate count (default 100).

const fs = require('fs').promises;
const path = require('path');
const { loadStandardRecipes, loadMasterKB } = require('./referenceDataService');

async function generateCandidates(request, opts = {}) {
  const count = opts.candidateCount || 100;
  const recipes = await loadStandardRecipes();
  const kb = await loadMasterKB();

  const candidates = [];
  const seedInputs = extractSeedInputs(request, recipes);

  for (let i = 0; i < count; i++) {
    // Deterministic: use index-based variation rather than true random if reproducibility required
    const base = seedInputs[i % seedInputs.length] || seedInputs[0];
    const perturb = computePerturbation(base, request, i);
    candidates.push({
      candidate_id: `CAND-${String(i + 1).padStart(4, '0')}`,
      dyes: perturb.dyes,
      chemicals: perturb.chemicals,
      process_parameters: perturb.process,
      source_recipe_id: base.recipe_id || base.id || null,
      generation_notes: 'Generated via reference-recipe perturbation (deterministic).',
    });
  }
  return candidates;
}

function extractSeedInputs(request, recipes) {
  // Use standard recipes matching dye_class / fabric / fiber
  const dyeClass = (request.dye_class || '').toLowerCase();
  const fiber = (request.fiber_composition || []).map(f => f.toLowerCase()).join(' ');
  const fabric = (request.fabric_type || '').toLowerCase();
  const matched = recipes.filter(r => {
    const d = (r.dye_information && r.dye_information.dye_type || '').toLowerCase();
    const f = (r.basic_information && r.basic_information.fabric_type || '').toLowerCase();
    return (!dyeClass || d.includes(dyeClass)) && (!fabric || f.includes(fabric));
  });
  if (matched.length === 0) {
    // Fallback to first 5 recipes so generator still works
    return recipes.slice(0, 5);
  }
  return matched.slice(0, Math.min(10, matched.length));
}

function computePerturbation(baseRecipe, request, index) {
  // Simplified deterministic perturbation of dye % OWF and process
  const dyes = [];
  const chemicals = [];

  // Parse dye info from recipe (simplified)
  const dyeInfo = (baseRecipe.dye_information && baseRecipe.dye_information.dye_name) ? parseDyeString(baseRecipe.dye_information.dye_name) : [];
  for (let d = 0; d < Math.min(dyeInfo.length, 3); d++) {
    const pct = Math.max(0.5, Math.min(5, (dyeInfo[d].pct || 2) * (0.8 + (index % 5) * 0.05)));
    dyes.push({ dye_id: dyeInfo[d].name || `DYE-${d + 1}`, percentage_owf: +pct.toFixed(3), quantity_kg: +((pct / 100) * (request.fabric_weight_kg || 100)).toFixed(3) });
  }

  // Chemicals from recipe
  const chems = (baseRecipe.chemical_information || []);
  for (const ch of chems) {
    chemicals.push({ chemical_id: ch.chemical_name || `CHEM-${chemicals.length + 1}`, dosage: 1.0 + (index % 3) * 0.5, unit: ch.dosage ? 'g/L' : 'kg' });
  }

  // Process parameters with bounded ranges derived from process_constraints or defaults
  const pc = request.process_constraints || {};
  const liquorRatio = pc.liquor_ratio || 10;
  const temperature = (pc.temperature_min !== null && pc.temperature_min !== undefined) ? pc.temperature_min + 5 : 60;
  const time = (pc.time_max !== null && pc.time_max !== undefined) ? Math.max(30, pc.time_max - 10) : 60;
  const ph = (pc.ph_min !== null && pc.ph_min !== undefined) ? Math.max(6, Math.min(9, (pc.ph_min + pc.ph_max) / 2 || 7.5)) : 7.5;

  return {
    dyes,
    chemicals,
    process: {
      liquor_ratio: liquorRatio,
      temperature: Math.min(98, Math.max(40, temperature + (index % 4 - 2) * 2)),
      time_minutes: Math.max(20, Math.min(120, time + (index % 3 - 1) * 5)),
      ph: Math.max(5, Math.min(10, ph + (index % 3 - 1) * 0.2)),
    }
  };
}

function parseDyeString(str) {
  const out = [];
  if (!str) return out;
  const re = /([A-Za-z][A-Za-z0-9 .\-/()]+?)\s*\(\s*([\d.]+)\s*%\s*owf\s*\)/g;
  let m;
  while ((m = re.exec(str)) !== null) out.push({ name: m[1].trim(), pct: parseFloat(m[2]) });
  return out;
}

module.exports = { generateCandidates };
