// Wastewater Profile Predictor Service
// Provides wastewater parameter expectations via THREE clearly-separated modes:
//   1. prediction_status = 'available'        → real ML inference (must actually run a model)
//   2. prediction_status = 'not_available'    → no runnable validated model; never fabricates ML output
//   3. engineering_estimates                  → transparent, KB/arithmetic-grounded expectations
//                                             (e.g. dye-bath volume from liquor ratio, expected
//                                              bath pH from recipe) — NEVER presented as ML or as
//                                              laboratory measurements.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseLiquorRatio(input) {
  // Accepts 10 | '1:10' | '1:10.5' | 1.10  → numeric ratio (e.g. 10.0 means 10 L liquor per 1 kg fabric)
  if (typeof input === 'number' && input > 0) return input;
  if (typeof input === 'string') {
    const m = input.match(/([\d.]+)\s*:\s*([\d.]+)/);
    if (m) return parseFloat(m[2]) / parseFloat(m[1]);
    const n = parseFloat(input);
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
}

function personalization_engineering_estimates(recipeData) {
  const recipe = recipeData.recipe || recipeData;
  const process = recipe.process || recipeData.process || {};
  const batch = recipeData.batch || {};

  const liquor = parseLiquorRatio(recipe.liquor_ratio ?? process.liquor_ratio ?? recipe.process?.liquor_ratio ?? batch.liquor_ratio);
  const weightKg = Number(recipe.fabric_weight_kg ?? process.fabric_weight_kg ?? batch.fabric_weight_kg);

  const estimates = {};
  if (liquor !== null && !isNaN(weightKg) && weightKg > 0) {
    // Expected dye-bath volume: liquor_ratio × fabric weight (inherent dye-bath arithmetic).
    estimates.dye_bath_volume_m3 = +(liquor * weightKg / 1000).toFixed(2);
    estimates.calculation = 'liquor_ratio × fabric_weight_kg / 1000';
    estimates.basis = 'dye_bath_arithmetic';
  }
  const bathPh = Number(recipe.ph ?? process.ph ?? process.temperature_ph ?? recipeData.process?.ph);
  if (!isNaN(bathPh) && bathPh >= 0 && bathPh <= 14) {
    estimates.expected_bath_pH = bathPh;
    estimates.ph_basis = 'recipe process pH (expectation, not a measurement)';
  }

  return estimates;
}

function runWastewaterInference(activeVersion) {
  // Attempt REAL inference via an external wastewater CLI, if one is wired in.
  const candidates = [
    path.join(__dirname, '..', '..', 'ml', 'predict_wastewater_cli.py'),
    path.join(__dirname, '..', '..', 'ml', 'scripts', 'predict_wastewater.py'),
  ];
  for (const script of candidates) {
    if (fs.existsSync(script)) {
      const res = spawnSync('python', [script, '--version', activeVersion], { encoding: 'utf-8', timeout: 30000 });
      if (res.status === 0 && res.stdout) {
        try {
          const payload = JSON.parse(res.stdout.trim());
          if (payload && payload.prediction_status === 'available') return payload;
        } catch { /* fall through */ }
      }
    }
  }
  return null;
}

function predictWastewaterProfile(recipeData) {
  const modelDir = path.join(__dirname, '..', '..', 'ml', 'models', 'wastewater');
  const activeModelFile = path.join(modelDir, 'active_model.json');

  let modelAvailable = false;
  let activeVersion = 'none';

  if (fs.existsSync(activeModelFile)) {
    try {
      const raw = fs.readFileSync(activeModelFile, 'utf-8');
      const meta = JSON.parse(raw);
      if (meta.status === 'available') {
        modelAvailable = true;
        activeVersion = meta.active_version || (meta.versions && meta.versions.length ? meta.versions[meta.versions.length - 1] : 'v001');
      }
} catch { modelAvailable = false; }
  }

  if (modelAvailable) {
    // Real inference only — a placeholder artifact must NOT emit fabricated chemistry.
    const inference = runWastewaterInference(activeVersion);
    if (inference) {
      return {
        prediction_status: 'available',
        ...inference,
        model_versions: inference.model_versions || {},
        warnings: inference.warnings || [],
        engineering_estimates: personalization_engineering_estimates(recipeData),
      };
    }

    // Artifact exists, but inference cannot be executed: honest degraded state.
    return {
      prediction_status: 'not_available',
      predicted_profile: {
        pH: null, EC: null, TDS: null, turbidity: null, COD: null, BOD: null, color: null, flow: null,
      },
      model_versions: {},
      engineering_estimates: personalization_engineering_estimates(recipeData),
      warnings: [
        'A wastewater model artifact exists but no runnable inference runtime is wired for it.',
        `active_model.json status=available (active_version=${activeVersion}) but no real inference output produced.`,
        'No fabricated chemical parameters are returned in this state.',
      ],
    };
  }

  return {
    prediction_status: 'not_available',
    predicted_profile: {
      pH: null,
      EC: null,
      TDS: null,
      turbidity: null,
      COD: null,
      BOD: null,
      color: null,
      flow: null,
    },
    model_versions: {},
    engineering_estimates: personalization_engineering_estimates(recipeData),
    warnings: [
      'No validated wastewater profile prediction models exist yet.',
      'Wastewater chemistry (COD/BOD/TDS/EC/turbidity/color) requires measured laboratory samples; no fabricated values are returned.',
      'Only dye-bath arithmetic expectations (e.g. liquor volume, recipe-set pH) are provided in engineering_estimates.',
    ],
  };
}

module.exports = { predictWastewaterProfile };