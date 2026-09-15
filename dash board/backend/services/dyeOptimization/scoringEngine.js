// Scoring Engine — multi-objective
// Configurable weights; exposes components; does not invent unsupported metrics.

function scoreCandidate(candidate, predictedLab, targetLab, deltaE, cost, preferences = {}) {
  const shadeWeight = (preferences.shade_weight !== undefined) ? preferences.shade_weight : 1.0;
  const costWeight = (preferences.cost_weight !== undefined) ? preferences.cost_weight : 0.5;
  const waterWeight = (preferences.water_weight !== undefined) ? preferences.water_weight : 0.0;

  // Shade score: lower ΔE = better (normalized roughly, not absolute claim)
  const shadeScore = deltaE !== null && deltaE !== undefined ? Math.max(0, 1 - (deltaE / 30)) : 0;

  // Cost score: lower cost = better (relative)
  const costScore = cost !== null && cost !== undefined ? Math.max(0, 1 - (cost / 500)) : 0;

  // Feasibility score: basic process feasibility check (hard/soft constraints already evaluated separately)
  const feasibilityScore = 0.8; // base; reduced if process out of bounds (simplified)

  const waterScore = 0; // water-weighted scoring is not applied until a validated water metric exists (weight currently informational)

  const total = shadeWeight * shadeScore + costWeight * costScore + 0.3 * feasibilityScore + waterWeight * waterScore;

  return {
    total_score: +total.toFixed(4),
    components: {
      shade_score: +shadeScore.toFixed(4),
      cost_score: +costScore.toFixed(4),
      feasibility_score: +feasibilityScore.toFixed(4),
    },
    weights_used: { shade_weight: shadeWeight, cost_weight: costWeight, feasibility_weight: 0.3, water_weight: waterWeight },
    notes: 'Weights configurable via optimization_preferences. Shade score based on normalized ΔE (lower = better). Cost normalized against reference. Feasibility screened by constraint engine.',
  };
}

module.exports = { scoreCandidate };
