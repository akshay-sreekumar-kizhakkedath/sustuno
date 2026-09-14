// Water Estimator — honest process-water accounting for dye optimization.
// Two quantities, both labeled:
//   1. Liquor water: deterministic process arithmetic (liquor_ratio x batch kg).
//      This is computed, not measured.
//   2. KB reference band: machine-typical total process water (L/kg) transcribed
//      from master_knowledge_base.json water_consumption records.
// No optimality formula is invented: the candidate's liquor water is compared
// against the KB band (within / above) and reported. Ranking stays ΔE/score
// driven. No IoT / sensor data involved.

const ref = require('./textileReference');

function num(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getWaterBand(machineId) {
  if (!machineId) return null;
  const machine = ref.getMachine(String(machineId));
  if (!machine) return null;
  try {
    const fs = require('fs');
    const kb = JSON.parse(fs.readFileSync('D:/SUSTUNO/mater_knowledge_base/master_knowledge_base.json', 'utf-8'));
    const rec = (kb.knowledge_records || []).find(r =>
      r.domain === 'machine' && r.subject === machine.label && r.property === 'water_consumption');
    if (!rec) return null;
    const min = num(rec.minimum);
    const max = num(rec.maximum);
    if (min === null || max === null) return null;
    return { min_l_per_kg: min, max_l_per_kg: max, knowledge_id: rec.knowledge_id || null };
  } catch {
    return null;
  }
}

function estimateWater({ liquor_ratio, fabric_weight_kg, machine_id }) {
  const lr = num(liquor_ratio);
  const wt = num(fabric_weight_kg);
  const band = getWaterBand(machine_id);
  if (lr === null || wt === null || lr <= 0 || wt <= 0) {
    return {
      liquor_water_l: null,
      liquor_water_l_per_kg: null,
      kb_reference_band_l_per_kg: band,
      machine_id: machine_id || null,
      scope_note: 'Water cannot be computed without a positive liquor ratio and batch weight (continuous padding lines report pick-up %, not liquor ratio).',
    };
  }
  const perKg = +lr.toFixed(2);
  const total = +(lr * wt).toFixed(1);
  return {
    liquor_water_l: total,
    liquor_water_l_per_kg: perKg,
    kb_reference_band_l_per_kg: band,
    machine_id: machine_id || null,
    scope_note: band
      ? `Liquor water covers the dye bath only (liquor ratio x batch weight). The KB band (${band.min_l_per_kg}–${band.max_l_per_kg} L/kg, ${band.knowledge_id}) is total process water across all baths and wash steps, so the two are reported side by side, not compared as pass/fail.`
      : 'No KB water-consumption band configured for this machine; dye-bath liquor water reported on its own.',
  };
}

module.exports = { estimateWater, getWaterBand };
