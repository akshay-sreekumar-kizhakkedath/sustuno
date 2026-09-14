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

// --- Optimization Routes ---
const optimizationRoutes = require('./routes/optimizationRoutes');
app.use('/api/optimization', optimizationRoutes);

// --- Start Server ---

initKnowledgeBase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
});