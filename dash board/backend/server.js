require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./database/supabaseClient');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const KB_DIR = path.join(__dirname, '..', '..', 'mater_knowledge_base', 'source_json');
const KB_MASTER = path.join(__dirname, '..', '..', 'mater_knowledge_base', 'master_knowledge_base.json');

// Middleware
app.use(cors());
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

// Serve static dashboard page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- API Routes ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    // Simple query to check connection
    const { data, error } = await supabase.from('batches').select('count', { count: 'exact', head: true });
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

// --- IoT Telemetry (simulated endpoint) ---

app.get('/api/iot/telemetry', (req, res) => {
  // Return current water quality KPIs from the dashboard data
  // In production, this would pull from IoT sensors or a time-series DB
  res.json({
    ph: (Math.random() * 0.5 + 6.9).toFixed(2),
    ec: (Math.random() * 0.4 + 2.1).toFixed(2),
    turbidity: (Math.random() * 3 + 12).toFixed(1),
    temperature: (Math.random() * 4 + 28).toFixed(1),
    flow_rate: (Math.random() * 5 + 26).toFixed(1),
    timestamp: new Date().toISOString(),
  });
});

// --- AI Prediction Endpoint ---

app.post('/api/predict/dyeing', (req, res) => {
  const { fabric, dye, machine, shade } = req.body;

  // Placeholder: match against recipe rules in KB
  const match = standardRecipes.find(r => {
    const app = r.applicability || {};
    return (
      (!fabric || app.fiber?.some(f => f.toLowerCase().includes(fabric.toLowerCase()))) &&
      (!dye || app.dye_class?.some(d => d.toLowerCase().includes(dye.toLowerCase())))
    );
  });

  if (match) {
    res.json({
      confidence: match.confidence,
      recipe: match.subject,
      parameters: {
        value: match.value,
        conditions: match.conditions,
        formula: match.formula,
      },
      source: match.source,
    });
  } else {
    res.json({
      confidence: 'low',
      message: 'No exact recipe match found. Using nearest heuristic.',
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

// --- Start Server ---

initKnowledgeBase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
});