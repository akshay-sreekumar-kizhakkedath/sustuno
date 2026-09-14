// Textile Reference Data Routes — structured dropdown sources for the Dye Optimizer.
// All values derive from existing project data (standard recipes + KB); empty
// arrays are returned honestly when sources are unavailable. No IoT.
const express = require('express');
const router = express.Router();
const ref = require('../services/dyeOptimization/textileReference');

function ok(res, data) {
  return res.json({ success: true, data });
}
function fail(res, code, message) {
  return res.status(404).json({ success: false, error: { code, message } });
}

// GET /api/reference/fabrics
router.get('/fabrics', (req, res) => {
  const fabrics = ref.getFabrics();
  if (!fabrics.length) {
    return res.json({ success: true, data: { fabrics: [], note: 'No validated fabric definitions are currently available.' } });
  }
  return ok(res, { fabrics });
});

// GET /api/reference/fibers
router.get('/fibers', (req, res) => ok(res, { fibers: ref.getFibers() }));

// GET /api/reference/dye-classes?fabric_id=FAB-001
router.get('/dye-classes', (req, res) => {
  const list = ref.getDyeClasses(req.query.fabric_id || null);
  if (req.query.fabric_id && !ref.getFabric(req.query.fabric_id)) {
    return fail(res, 'UNKNOWN_FABRIC', `Unknown fabric_id '${req.query.fabric_id}'.`);
  }
  if (!list.length) {
    return res.json({ success: true, data: { dye_classes: [], note: 'No validated dye class available for this material.' } });
  }
  return ok(res, { dye_classes: list });
});

// GET /api/reference/machines
router.get('/machines', (req, res) => {
  const machines = ref.getMachines();
  if (!machines.length) {
    return res.json({ success: true, data: { machines: [], note: 'No validated machine definitions are currently available.' } });
  }
  return ok(res, { machines });
});

// GET /api/reference/recipe-resources?recipe_id=REC-COT-001
router.get('/recipe-resources', (req, res) => {
  if (!req.query.recipe_id) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_RECIPE_ID', message: 'recipe_id query parameter is required.', field: 'recipe_id' } });
  }
  const r = ref.getRecipeResources(req.query.recipe_id);
  if (!r) return fail(res, 'UNKNOWN_RECIPE', `Unknown recipe_id '${req.query.recipe_id}'.`);
  return ok(res, r);
});

// GET /api/reference/process-defaults?recipe_id=REC-COT-001
router.get('/process-defaults', (req, res) => {
  if (!req.query.recipe_id) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_RECIPE_ID', message: 'recipe_id query parameter is required.', field: 'recipe_id' } });
  }
  const d = ref.getProcessDefaults(req.query.recipe_id);
  if (!d) return fail(res, 'UNKNOWN_RECIPE', `Unknown recipe_id '${req.query.recipe_id}'.`);
  return ok(res, d);
});

module.exports = router;
