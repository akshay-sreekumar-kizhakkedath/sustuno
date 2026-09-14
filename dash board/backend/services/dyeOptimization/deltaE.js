// ΔE Calculator (CIE76; designed to support ΔE2000 later)

function deltaE76(L1, a1, b1, L2, a2, b2) {
  const dL = (L1 || 0) - (L2 || 0);
  const da = (a1 || 0) - (a2 || 0);
  const db = (b1 || 0) - (b2 || 0);
  const de = Math.sqrt(dL * dL + da * da + db * db);
  return +de.toFixed(4);
}

function calculateDeltaE(predictedLab, targetLab) {
  if (!predictedLab || !targetLab) return null;
  return deltaE76(predictedLab.L, predictedLab.a, predictedLab.b, targetLab.L, targetLab.a, targetLab.b);
}

module.exports = { deltaE76, calculateDeltaE };
