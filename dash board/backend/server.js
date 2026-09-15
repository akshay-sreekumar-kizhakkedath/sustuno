require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./database/supabaseClient');
const fs = require('fs').promises;
const path = require('path');

// Serve React frontend build from public/ (populated by render.yaml build step)
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
const PORT = process.env.PORT || 5000;
const dataPaths = require('./data/paths');
const KB_DIR = dataPaths.KB_SOURCE_DIR;
const KB_MASTER = dataPaths.KB_MASTER;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '50mb' }));

// --- Helper Functions ---

async function loadJson(filePath) {
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data);
}

// Build a searchable index from master KB at startup
let kbIndex = [];
let etpRules = null;
let standardRecipes = null;
let machineData = null;

async function initKnowledgeBase() {
  // Load master KB
  try {
    const raw = await loadJson(KB_MASTER);
    kbIndex = raw.knowledge_records || [];
    console.log(`Indexed ${kbIndex.length} knowledge records`);
  } catch (e) {
    console.error('Failed to load master KB:', e.message);
    // Fallback: load individual JSON files
    const files = await fs.readdir(KB_DIR);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const d = await loadJson(path.join(KB_DIR, f));
          if (d.knowledge_records) {
            kbIndex.push(...d.knowledge_records);
          }
        } catch {}
      }
    }
  }

  // Load ETP rules
  etpRules = await loadKBDirectory('ETP');

  // Load standard recipes
  standardRecipes = await loadKBDirectory('recipe');

  // Load machine data
  machineData = await loadKBDirectory('machine');
}

async function loadKBDirectory(domain) {
  // Search master index by domain
  return kbIndex.filter(r =>
    r.domain?.toLowerCase() === domain.toLowerCase() ||
    r.knowledge_type?.toLowerCase() === domain.toLowerCase()
  );
}

// Serve React frontend static assets (JS, CSS, images, etc.)
app.use(express.static(PUBLIC_DIR));

// --- API Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    // Simple query to check connection
    const { error } = await supabase.from('batches').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Database health check failed:', err.message);
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message, timestamp: new Date().toISOString() });
  }
});

// --- ETP (Effluent Treatment Plant) Routes ---

app.get('/api/etp/stages', (req, res) => {
  const stages = {};
  if (etpRules.length) {
    etpRules.forEach(r => {
      const raw = r.source?.excerpt;
      if (raw && typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.stage_id) {
            stages[parsed.stage_id] = parsed;
          }
        } catch {}
      }
    });
  }
  res.json(stages);
});

app.get('/api/etp/rules', (req, res) => {
  const rules = etpRules.map(r => r.source?.excerpt).filter(Boolean).map(e => {
    try { return JSON.parse(e); } catch { return e; }
  });
  res.json(rules);
});

app.get('/api/etp/chemical-dosing', (req, res) => {
  // Return chemical-specific ETP rules from knowledge base
  const chemRules = kbIndex.filter(r =>
    r.domain?.toLowerCase().includes('etp') &&
    r.subject?.toLowerCase().includes('chemical')
  );
  res.json(chemRules);
});

app.get('/api/etp/compliance/standards', (req, res) => {
  const stds = kbIndex.filter(r =>
    r.domain?.toLowerCase().includes('compliance') ||
    r.subject?.toLowerCase().includes('standard') ||
    r.subject?.toLowerCase().includes('limit')
  );
  res.json(stds.slice(0, 50));
});

// --- Recipe Routes ---

app.get('/api/recipes', (req, res) => {
  const recipes = standardRecipes
    .filter(r => r.knowledge_type === 'recipe')
    .map(r => ({
      id: r.knowledge_id,
      subject: r.subject,
      value: r.value,
      domain: r.domain,
      applicability: r.applicability,
      conditions: r.conditions,
      formula: r.formula,
      confidence: r.confidence,
    }));
  res.json(recipes);
});

app.get('/api/recipes/:id', async (req, res) => {
  const recipe = kbIndex.find(r => r.knowledge_id === req.params.id);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  res.json(recipe);
});

app.get('/api/recipes/fiber/:fiber', (req, res) => {
  const fiber = req.params.fiber.toLowerCase();
  const recipes = standardRecipes
    .filter(r => r.applicability?.fiber?.some(f => f.toLowerCase().includes(fiber)))
    .slice(0, 20);
  res.json(recipes);
});

// --- Machine Routes ---

app.get('/api/machines', (req, res) => {
  const machines = machineData
    .filter(r => r.knowledge_type === 'fact' && r.subject?.includes('Machine'))
    .map(r => ({
      id: r.knowledge_id,
      subject: r.subject,
      value: r.value,
      unit: r.unit,
      applicability: r.applicability,
    }));
  res.json(machines);
});

// --- Knowledge Search ---

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  const domain = req.query.domain;
  const knowledgeType = req.query.type;

  let results = kbIndex;

  // Filter by domain
  if (domain) {
    results = results.filter(r => r.domain?.toLowerCase().includes(domain.toLowerCase()));
  }

  // Filter by knowledge type
  if (knowledgeType) {
    results = results.filter(r => r.knowledge_type?.toLowerCase() === knowledgeType.toLowerCase());
  }

  // Text search across key fields
  if (q) {
    results = results.filter(r =>
      r.subject?.toLowerCase().includes(q) ||
      r.property?.toLowerCase().includes(q) ||
      r.value?.toString().toLowerCase().includes(q) ||
      JSON.stringify(r.applicability).toLowerCase().includes(q)
    );
  }

  // Limit and format
  results = results.slice(0, 100).map(r => ({
    knowledge_id: r.knowledge_id,
    domain: r.domain,
    knowledge_type: r.knowledge_type,
    subject: r.subject,
    property: r.property,
    value: r.value,
    unit: r.unit,
    minimum: r.minimum,
    maximum: r.maximum,
    confidence: r.confidence,
    applicability: r.applicability,
    conditions: r.conditions,
  }));
  
  res.json(results);
});

// --- Chemical Compatibility ---

app.get('/api/chemicals/compatibility', (req, res) => {
  const { chemical } = req.query;
  let chemRules = kbIndex.filter(
    r => r.domain?.toLowerCase().includes('chemical') || r.subject?.toLowerCase().includes('compatibility')
  );

  if (chemical) {
    const c = chemical.toLowerCase();
    chemRules = chemRules.filter(r =>
      r.subject?.toLowerCase().includes(c) ||
      JSON.stringify(r.applicability?.chemical || []).toLowerCase().includes(c)
    );
  }

  res.json(chemRules.slice(0, 50));
});

// --- IoT Telemetry: Demo endpoint (kept for backward compatibility) ---

app.get('/api/iot/telemetry', (req, res) => {
  res.json({
    status: 'demo',
    out_of_scope: true,
    data_source: 'simulated_demo',
    message: 'Use POST /api/iot/readings for live ESP32 data.',
    metrics: { ph: null, ec: null, turbidity: null, temperature: null, flow_rate: null },
    timestamp: new Date().toISOString(),
  });
});

// --- IoT: Receive sensor readings from ESP32 ---
//
// This endpoint receives JSON payloads from the ESP32 firmware and stores
// them in Supabase tables. It is the primary data ingestion point for the
// SUSTUNO IoT pipeline.
//
// POST /api/iot/readings
// Headers: Content-Type: application/json, X-API-Key: <key>
//
// Stores into:
//   - sensor_telemetry  (per-sensor time-series rows)
//   - iot_alerts        (threshold-based alerts)
//   - gateway_status    (device health heartbeat)

app.post('/api/iot/readings', async (req, res) => {
  try {
    const { device_id, plant_id, batch_id, timestamp, sensors, device_info } = req.body;

    if (!device_id || !sensors) {
      return res.status(400).json({ error: 'Missing device_id or sensors in payload' });
    }

    const ts = timestamp || new Date().toISOString();
    const inserted = [];

    // Insert each sensor reading as a separate telemetry row
    const sensorEntries = [
      { key: 'ph', sensor_id: 'ph' },
      { key: 'tds_ppm', sensor_id: 'tds' },
      { key: 'turbidity_ntu', sensor_id: 'turbidity' },
      { key: 'temperature_c', sensor_id: 'temperature' },
      { key: 'flow_lpm', sensor_id: 'flow_rate' },
    ];

    for (const entry of sensorEntries) {
      const s = sensors[entry.key];
      if (!s) continue;

      const telemetryRow = {
        sensor_id: entry.sensor_id,
        device_id,
        plant_id: plant_id || null,
        batch_id: batch_id || null,
        value: s.value,
        quality: (s.status === 'OK') ? 'normal'
          : (s.status === 'WARNING') ? 'warning'
          : (s.status === 'ERROR' || s.status === 'DISCONNECTED' || s.status === 'SATURATED') ? 'critical'
          : 'normal',
        raw_voltage: s.raw_voltage || null,
        probe_voltage: s.probe_voltage || null,
        status: s.status,
        timestamp: ts,
      };

      if (sensors[entry.key].total_liters !== undefined) {
        telemetryRow.total_liters = sensors[entry.key].total_liters;
      }

      const { error } = await supabase.from('sensor_telemetry').insert(telemetryRow);
      if (error) {
        console.error(`[IoT] Failed to insert ${entry.sensor_id}:`, error.message);
      } else {
        inserted.push(entry.sensor_id);
      }
    }

    // Upsert gateway status (heartbeat)
    if (device_info) {
      const gatewayRow = {
        device_id,
        model: 'ESP32 Dev Module',
        firmware: device_info.firmware || '1.0.0',
        wifi_signal: `${device_info.wifi_rssi_dbm || 0} dBm`,
        mqtt_status: 'REST (direct)',
        uptime: `${device_info.uptime_s || 0}s`,
        free_heap: device_info.free_heap_bytes || 0,
        health: device_info.health || 'UNKNOWN',
        created_at: ts,
      };

      const { error } = await supabase.from('gateway_status').insert(gatewayRow);
      if (error) {
        console.error('[IoT] Gateway status insert failed:', error.message);
      }
    }

    // Check thresholds and insert alerts
    const alerts = [];
    if (sensors.ph && sensors.ph.value !== null) {
      if (sensors.ph.value > 8.5) alerts.push({ tone: 'red', title: 'High pH Detected', description: `pH ${sensors.ph.value} exceeded 8.5 threshold` });
      if (sensors.ph.value < 5.5) alerts.push({ tone: 'red', title: 'Low pH Detected', description: `pH ${sensors.ph.value} below 5.5 threshold` });
    }
    if (sensors.turbidity_ntu && sensors.turbidity_ntu.value !== null && sensors.turbidity_ntu.value > 50) {
      alerts.push({ tone: 'orange', title: 'High Turbidity', description: `Turbidity ${sensors.turbidity_ntu.value} NTU exceeded 50 threshold` });
    }
    if (sensors.temperature_c && sensors.temperature_c.value !== null) {
      if (sensors.temperature_c.value > 40) alerts.push({ tone: 'red', title: 'High Temperature', description: `Temperature ${sensors.temperature_c.value}°C exceeded 40°C` });
    }

    for (const alert of alerts) {
      await supabase.from('iot_alerts').insert({
        ...alert,
        acknowledged: false,
        timestamp: ts,
      });
    }

    res.json({
      status: 'ok',
      inserted,
      alerts_generated: alerts.length,
      timestamp: ts,
    });
  } catch (err) {
    console.error('[IoT] Readings ingestion error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- IoT: Get latest readings for a device (for dashboard) ---

app.get('/api/iot/readings/latest', async (req, res) => {
  try {
    const device_id = req.query.device_id || 'SUSTUNO-ESP32-001';

    const { data, error } = await supabase
      .from('sensor_telemetry')
      .select('*')
      .eq('device_id', device_id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ status: 'ok', device_id, readings: data });
  } catch (err) {
    console.error('[IoT] Latest readings error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Knowledge-Base Recipe Lookup Endpoint ---
// NOTE: this is a structured KB RULE LOOKUP, not an ML prediction. It never claims
// ML confidence. Use /api/optimization/dye-recipe for the full optimizer pipeline
// (which honestly reports model_status = not_available until a validated model exists).

app.post('/api/predict/dyeing', (req, res) => {
  const { fabric, dye } = req.body;

  const match = standardRecipes.find(r => {
    const app = r.applicability || {};
    return (
      (!fabric || app.fiber?.some(f => f.toLowerCase().includes(fabric.toLowerCase()))) &&
      (!dye || app.dye_class?.some(d => d.toLowerCase().includes(dye.toLowerCase())))
    );
  });

  if (match) {
    res.json({
      prediction_kind: 'kb_rule_lookup',
      model_status: 'not_available',
      is_ml_prediction: false,
      kb_confidence: match.confidence,
      recipe: match.subject,
      parameters: {
        value: match.value,
        conditions: match.conditions,
        formula: match.formula,
      },
      source: match.source,
      warnings: ['This is a knowledge-base recipe retrieval, NOT an ML prediction. ML shade prediction model_status is not_available.'],
    });
  } else {
    res.json({
      prediction_kind: 'kb_rule_lookup',
      model_status: 'not_available',
      is_ml_prediction: false,
      kb_confidence: null,
      message: 'No exact knowledge-base recipe match found. Run the dye optimizer (/api/optimization/dye-recipe) with structured validated inputs instead.',
      warnings: ['No fabricated prediction or confidence is returned.'],
    });
  }
});

// --- Textile Reference Data Routes (structured optimizer dropdowns) ---
const referenceRoutes = require('./routes/referenceRoutes');
app.use('/api/reference', referenceRoutes);

// --- Optimization Routes ---
const optimizationRoutes = require('./routes/optimizationRoutes');
app.use('/api/optimization', optimizationRoutes);

// --- ML status/predict Routes (honest not_available; mounted BEFORE dyeBatchRoutes
// so /api/ml/status is not captured by the dye-batch /:id param route) ---
const mlRoutes = require('./routes/mlRoutes');
app.use('/api/ml', mlRoutes);

// --- Dye Batch Data Collection Routes ---
const dyeBatchRoutes = require('./routes/dyeBatchRoutes');
app.use('/api/dye-batches', dyeBatchRoutes);
app.use('/api/ml', dyeBatchRoutes); // /api/ml/dataset/readiness shares the same router

// --- Wastewater & ETP Decision Support Routes ---
const wastewaterRoutes = require('./routes/wastewaterRoutes');
app.use('/api/wastewater', wastewaterRoutes);

const etpRoutes = require('./routes/etpRoutes');
app.use('/api/etp', etpRoutes);

// --- Production, Overview, Analytics & Reports Routes ---
const productionRoutes = require('./routes/productionRoutes');
app.use('/api/production', productionRoutes);

const overviewRoutes = require('./routes/overviewRoutes');
app.use('/api/overview', overviewRoutes);

const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);

const reportsRoutes = require('./routes/reportsRoutes');
app.use('/api/reports', reportsRoutes);

// --- SPA Catch-all: serve React index.html for all non-API routes ---
// This must come AFTER all API routes so /api/* is not intercepted.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend not built. Run the build step first.' });
    }
  });
});

// --- Start Server ---

initKnowledgeBase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
    console.log(`Frontend served from: ${PUBLIC_DIR}`);
  });
});