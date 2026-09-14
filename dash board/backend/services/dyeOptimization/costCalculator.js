// Cost Calculator (recipe-level estimated cost)
// Does not invent costs; uses available dye/chemical reference prices when present.

function estimateRecipeCost(recipe, referencePrices = {}) {
  let total = 0;
  // Dye costs
  for (const dye of (recipe.dyes || [])) {
    const pricePerKg = referencePrices[dye.dye_id] || (referencePrices['default_dye'] || 15);
    total += (dye.quantity_kg || 0) * pricePerKg;
  }
  // Chemical costs
  for (const ch of (recipe.chemicals || [])) {
    const pricePerUnit = referencePrices[ch.chemical_id] || (referencePrices['default_chem'] || 8);
    const dosage = ch.dosage || 0;
    // Rough approximation: dosage in kg (if unit is kg) else approximate conversion
    total += dosage * pricePerUnit;
  }
  // Water/process cost approximation based on liquor ratio
  const liquor = (recipe.process_parameters && recipe.process_parameters.liquor_ratio) ? recipe.process_parameters.liquor_ratio : 0;
  total += liquor * (referencePrices['water_l'] || 0.05) * ((recipe.quantity_kg || 100) || 100);
  return +total.toFixed(3);
}

module.exports = { estimateRecipeCost };
