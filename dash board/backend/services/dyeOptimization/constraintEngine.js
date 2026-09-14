// Knowledge / Constraint Filtering with Rule Integration
// Uses structured retrieval from master_knowledge_base.json and rule_base.json.
// Does NOT create RAG or vector DB.
// Handles pending human_validation_status explicitly (advisory by default).

const fs = require('fs').promises;
const path = require('path');

const RULE_FILE = 'D:/SUSTUNO/mater_knowledge_base/rule_base.json';

async function loadRules() {
  try {
    const raw = await fs.readFile(RULE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.rules || [];
  } catch (e) {
    return [];
  }
}

function evaluateRules(candidateRecipe, rules, mode = 'advisory') {
  // mode: 'advisory' (pending rules = warning), 'prototype_block' (pending rules may block if configured)
  const results = [];
  for (const rule of rules || []) {
    const status = evaluateSingleRule(rule, candidateRecipe, mode);
    results.push({
      rule_id: rule.rule_id || 'unknown',
      status: status.status,
      severity: status.severity,
      message: status.message,
      source_knowledge_id: rule.source && rule.source.knowledge_id ? rule.source.knowledge_id : (rule.source && rule.source.knowledge_id),
      human_validation_status: rule.validation && rule.validation.human_validation_status ? rule.validation.human_validation_status : 'pending',
      note: (rule.validation && rule.validation.human_validation_status === 'pending') ? 'Rule has pending human validation; treated as advisory/prototype only.' : undefined,
    });
  }
  return results;
}

function evaluateSingleRule(rule, recipe, mode) {
  const validation = (rule.validation || {});
  const humanStatus = validation.human_validation_status || 'pending';
  const isPending = humanStatus === 'pending';

  // Basic applicability filter using rule.applicability fields
  const applicable = isApplicable(rule, recipe);
  if (!applicable) {
    return { status: 'not_applicable', severity: 'info', message: 'Not applicable to this candidate.' };
  }

  // Check conditions if defined (simplified: use chemical/prohibit match if available)
  const action = rule.action || {};
  const message = action.message || rule.description || 'Rule evaluated.';

  if (isPending && mode === 'advisory') {
    return { status: 'warning', severity: 'warning', message: message + ' [PENDING HUMAN VALIDATION — advisory only]' };
  }

  if (action.type === 'prohibit') {
    return { status: 'fail', severity: 'critical', message: message + (isPending ? ' [PROTOTYPE: pending validation]' : '') };
  }

  return { status: 'pass', severity: 'info', message: message + (isPending ? ' [PENDING VALIDATION]' : '') };
}

function isApplicable(rule, recipe) {
  // Simplified check: match dye_class / fiber / chemical by substring
  const app = rule.applicability || {};
  const dyeClass = (recipe.dye_class || '').toLowerCase();
  const fiber = (recipe.fiber || '').toLowerCase();
  const chemicals = (recipe.chemicals || []).map(c => (c.chemical_id || '').toLowerCase());

  if (app.dye_class && app.dye_class.length > 0) {
    if (!app.dye_class.some(dc => dyeClass.includes(dc.toLowerCase()))) return false;
  }
  if (app.fiber && app.fiber.length > 0) {
    if (!app.fiber.some(f => fiber.includes(f.toLowerCase()))) return false;
  }
  if (app.chemical && app.chemical.length > 0) {
    // If rule mentions a chemical, check if it appears in recipe chemicals
    const hasChemical = app.chemical.some(ch => chemicals.some(c => c.includes(ch.toLowerCase())));
    if (!hasChemical) return false;
  }
  return true;
}

module.exports = { loadRules, evaluateRules, isApplicable };
