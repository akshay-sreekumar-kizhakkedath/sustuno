// Shade Prediction Model Interface
// Does NOT fabricate predictions. Returns model_status='not_available' if no trained model exists.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ML_DIR = process.env.ML_DIR_PATH || path.join(__dirname, '..', '..', '..', 'ml');
const ACTIVE_MODEL_JSON = path.join(ML_DIR, 'models', 'active_model.json');
const DEMO_MODEL_JSON = path.join(ML_DIR, 'models', 'demo', 'active_model.json');

// Demo mode serves the isolated synthetic demo model ONLY when explicitly enabled.
// Production model status is never affected by the demo artifact.
function demoEnabled() {
  return process.env.SUSTUNO_DEMO_MODEL === '1';
}

function demoExists() {
  if (!demoEnabled()) return false;
  try {
    const raw = fs.readFileSync(DEMO_MODEL_JSON, 'utf-8');
    const meta = JSON.parse(raw);
    return meta.status === 'available' && !!meta.meta?.artifact_path && fs.existsSync(meta.meta.artifact_path);
  } catch {
    return false;
  }
}

// Check for actual trained model artifacts
function modelExists() {
  if (!fs.existsSync(ACTIVE_MODEL_JSON)) {
    return false;
  }
  try {
    const raw = fs.readFileSync(ACTIVE_MODEL_JSON, 'utf-8');
    const meta = JSON.parse(raw);
    return meta.status === 'available' && !!meta.meta?.artifact_path && fs.existsSync(meta.meta.artifact_path);
  } catch {
    return false;
  }
}

function getModelStatus() {
  if (demoExists()) {
    try {
      const raw = fs.readFileSync(DEMO_MODEL_JSON, 'utf-8');
      const info = JSON.parse(raw);
      return {
        available: true,
        status: 'demo_synthetic',
        model_version: (info.active_version || 'dye_shade_model_v001') + '-demo',
        metrics: info.meta?.metrics || null,
        demo: true,
        note: 'DEMO model trained on synthetic data for UI testing only. Not for production use.',
      };
    } catch {}
  }
  const available = modelExists();
  if (!available) {
    return {
      available: false,
      status: 'not_available',
      model_version: 'none',
      note: 'No trained shade-prediction model exists yet. The pipeline runs in development/fallback mode.',
    };
  }
  try {
    const raw = fs.readFileSync(ACTIVE_MODEL_JSON, 'utf-8');
    const info = JSON.parse(raw);
    return {
      available: true,
      status: 'available',
      model_version: info.active_version || 'dye_shade_model_v001',
      metrics: info.meta?.metrics || null,
      note: 'Trained supervised ML model active.',
    };
  } catch {
    return {
      available: false,
      status: 'not_available',
      model_version: 'none',
      note: 'Error reading active model metadata.',
    };
  }
}

function predictShade(features) {
  const useDemo = demoExists();
  const available = useDemo || modelExists();
  if (!available) {
    return {
      L: null,
      a: null,
      b: null,
      confidence: null,
      model_version: 'none',
      model_status: 'not_available',
      note: 'Prediction unavailable: no trained model.',
    };
  }

  // Once a real model is available, execute inference script
  try {
    const scriptPath = path.join(ML_DIR, 'inference', 'predict_shade.py');
    const inputArg = JSON.stringify(features || {});
    const stdout = execFileSync('python', [scriptPath, '--input', inputArg], {
      encoding: 'utf-8',
      timeout: 60000,
    });
    const result = JSON.parse(stdout.trim());
    return {
      L: result.predicted_lab?.L ?? null,
      a: result.predicted_lab?.a ?? null,
      b: result.predicted_lab?.b ?? null,
      confidence: null, // Confidence is null unless calibrated uncertainty model is used
      model_version: result.model_version || 'unknown',
      model_status: result.model_status || (useDemo ? 'demo_synthetic' : 'available'),
      demo: useDemo || undefined,
    };
  } catch (err) {
    console.error('Inference error in shadePredictionModel:', err.message);
    return {
      L: null,
      a: null,
      b: null,
      confidence: null,
      model_version: 'unknown',
      model_status: 'error',
      note: 'Inference execution failed: ' + err.message,
    };
  }
}

function predictShadeBatch(rows) {
  const useDemo = demoExists();
  const available = useDemo || modelExists();
  if (!available || !Array.isArray(rows) || rows.length === 0) {
    return { model_status: 'not_available', results: (rows || []).map(() => ({ L: null, a: null, b: null })) };
  }
  // Single Python process for the whole batch: one model load, N predictions.
  // Rows travel via stdin to avoid OS command-line length limits.
  try {
    const scriptPath = path.join(ML_DIR, 'inference', 'predict_shade.py');
    const stdout = execFileSync('python', [scriptPath], {
      encoding: 'utf-8',
      input: JSON.stringify(rows),
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    });
    const result = JSON.parse(stdout.trim());
    return {
      model_status: result.model_status || (useDemo ? 'demo_synthetic' : 'available'),
      model_version: result.model_version || 'unknown',
      results: Array.isArray(result.results) ? result.results : rows.map(() => ({ L: null, a: null, b: null })),
      demo: useDemo || undefined,
    };
  } catch (err) {
    console.error('Batch inference error in shadePredictionModel:', err.message);
    return { model_status: 'error', results: rows.map(() => ({ L: null, a: null, b: null })) };
  }
}

module.exports = { predictShade, predictShadeBatch, getModelStatus, modelExists, demoExists };
