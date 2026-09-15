// ETP Decision Support Engine
// Advisory decision support system for Effluent Treatment Plant management.
// Does NOT control physical hardware. Evaluates KB rules with human_validation_status='pending'.
//
// Chemical dosing guidance is grounded in the project Knowledge Base
// (source_json/etp_chemical_dosing_rules.json) which records reference dosage
// RANGES per chemical, NOT precise point formulas. Exact in-plant dosing must be
// established by jar-test calibration + verified inlet measurements; the engine
// never fabricates a precise dosage without that supporting data.

const fs = require('fs');
const path = require('path');

const KB_ROOT = path.join(__dirname, '..', '..', '..', '..', 'mater_knowledge_base');
const RULE_BASE_PATH = path.join(KB_ROOT, 'rule_base.json');
const ETP_DOSING_FILE = path.join(KB_ROOT, 'source_json', 'etp_chemical_dosing_rules.json');

function loadRuleBase() {
  try {
    if (fs.existsSync(RULE_BASE_PATH)) {
      const raw = fs.readFileSync(RULE_BASE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      return data.rules || data.rule_base || [];
    }
  } catch (e) {
    console.error('Failed to load ETP rule base:', e.message);
  }
  return [];
}

// Reference dosage matrix transcribed from the KB (etp_chemical_dosing_rules.json).
// Ranges are engineering references for decision support — NOT exact dosing instructions.
function loadDosingMatrix() {
  try {
    if (fs.existsSync(ETP_DOSING_FILE)) {
      const raw = fs.readFileSync(ETP_DOSING_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.chemicals)) return data.chemicals;
    }
  } catch (e) {
    console.error('Failed to load ETP chemical dosing rules:', e.message);
  }
  return [];
}

function parseRange(value) {
  // "100 - 300" or "150-400" (mg/L) -> [100, 300] ; "0.5 - 2.0" -> [0.5, 2.0]
  const m = String(value || '').match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}

function evaluateEtpDecision(inputData) {
  const rules = loadRuleBase();
  const dosingMatrix = loadDosingMatrix();
  const kbDosingAvailable = dosingMatrix.length > 0;

  const recipe = inputData.recipe || inputData;
  const wastewater = inputData.wastewater_profile || {};
  const plantConfig = inputData.plant_config || {};

  const evaluatedRules = rules.map(r => ({
    rule_id: r.rule_id || r.id,
    knowledge_id: r.knowledge_id,
    subject: r.subject,
    domain: r.domain,
    evaluation: 'advisory',
    human_validation_status: r.validation && r.validation.human_validation_status
      ? r.validation.human_validation_status
      : 'pending',
    excerpt: r.source && r.source.excerpt ? r.source.excerpt : null
  }));

  const hasJarTest = Boolean(plantConfig.jar_test_data);
  const hasInletCod = wastewater.COD !== null && wastewater.COD !== undefined;
  const hasInletPh = wastewater.pH !== null && wastewater.pH !== undefined;

  let dosingStatus = 'insufficient_data';
  let dosingRecommendation = null;
  let dosingWarning = null;

  if (hasJarTest && (hasInletCod || hasInletPh)) {
    // Jar-test data exists: we may anchor within the KB chemical ranges.
    // Coagulant selection is based on dye class + KB purpose notes; the reported
    // dosage is the KB reference RANGE, not a fabricated point value.
    dosingStatus = 'advisory_reference_range';
    const reactive = /reactive/i.test(recipe.dye_class || '');
    const disperse = /disperse/i.test(recipe.dye_class || '');
    // KB-grounded coagulant selection by dye class (KB purpose notes; reference range only):
    //   Ferrous Sulfate — decolorization of reactive/sulfur dye effluent
    //   PAC — high-density floc formation across dye classes
    //   Alum — general colloidal color and suspended solids precipitation
    let chosenCoag = null;
    let selectionReason = null;
    if (reactive) {
      chosenCoag = dosingMatrix.find(c => /Ferrous Sulfate/i.test(c.chemical_name)) || dosingMatrix.find(c => /PAC/i.test(c.chemical_name));
      selectionReason = 'Reactive effluent — KB lists Ferrous Sulfate for decolorization of reactive dye effluent.';
    } else if (disperse) {
      chosenCoag = dosingMatrix.find(c => /PAC/i.test(c.chemical_name));
      selectionReason = 'Disperse effluent — PAC preferred flocculant in KB dosing matrix.';
    } else {
      chosenCoag = dosingMatrix.find(c => /Alum/i.test(c.chemical_name)) || dosingMatrix.find(c => /PAC/i.test(c.chemical_name));
      selectionReason = 'General effluent — KB lists Alum/PAC for primary coagulation.';
    }
    const coagFallback = dosingMatrix.find(c => /Alum/i.test(c.chemical_name));

    const coagulant = chosenCoag || coagFallback;
    const polymer = dosingMatrix.find(c => /Polyelectrolyte|Polyacrylamide|PAM/i.test(c.chemical_name));

    const coagRange = coagulant ? parseRange(coagulant.typical_dosage_mg_l) : null;
    const polymerRange = polymer ? parseRange(polymer.typical_dosage_mg_l) : null;

    const phAgent =
      hasInletPh && wastewater.pH !== null && wastewater.pH < 6.5
        ? { agent: 'Soda Ash / Hydrated Lime', kb_stage: 'Neutralization', kb_ph_target: '8.5 - 10.0 (lime)' }
        : hasInletPh && wastewater.pH !== null && wastewater.pH > 8.5
          ? { agent: 'Sulfuric Acid (H2SO4)', kb_stage: 'Neutralization', kb_ph_target: '7.0 - 7.5' }
          : null;

    dosingRecommendation = {
      coagulant: {
        chemical: coagulant ? coagulant.chemical_name : 'Coagulant (per jar-test)',
        selection_reason: selectionReason,
        kb_dosage_range_mg_l: coagRange ? coagRange : null,
        dosages_from_kb_or_jar_test: true,
      },
      flocculant: {
        chemical: polymer ? polymer.chemical_name : 'Polyelectrolyte (per jar-test)',
        kb_dosage_range_mg_l: polymerRange ? polymerRange : null,
        dosages_from_kb_or_jar_test: true,
      },
      ph_adjustment: phAgent,
      exact_dosing_g_m3: 'Not computed — exact dosing requires jar-test calibration against the KB reference range.',
    };
  } else {
    dosingStatus = 'insufficient_data';
    dosingWarning = 'Exact chemical dosing requires recent jar-test laboratory data plus verified inlet COD/pH measurements. The engine will not fabricate a precise dosage without them.';
  }

  const strategies = [
    {
      stage: 'Equalization & Homogenization',
      action: 'Buffer high-dye discharge in equalization tank to damp peak pH/COD loads before primary treatment.',
      evidence: ['Concentrated dye-liquor discharge typical of batch dyeing'],
    },
    {
      stage: 'Primary Coagulation & Flocculation',
      action: dosingStatus === 'advisory_reference_range'
        ? `Select coagulant within KB reference range (see dosing recommendation); jar-test to lock the operating dosage.`
        : 'Run jar tests to establish coagulant dosage for the current dye class before dosing.',
      evidence: ['KB chemical dosing matrix is advisory only', dosingWarning || 'Color removal requires coagulation/flocculation'],
    },
    {
      stage: 'Biological Aeration',
      action: 'Maintain dissolved oxygen (DO) between 2.0 - 3.0 mg/L in the activated sludge basin per standard aerobic practice.',
      evidence: ['Project ETP process rules (advisory)'],
    },
  ];

  const kbDosingNote = kbDosingAvailable
    ? `Dosing ranges read from KB source_json/etp_chemical_dosing_rules.json (${dosingMatrix.length} chemical records, advisory reference only).`
    : 'KB chemical dosing matrix unavailable — no reference ranges loaded.';

  return {
    recommendation_status: dosingStatus === 'advisory_reference_range' ? 'advisory_generated' : 'insufficient_data',
    recommendation: 'Buffer bath discharge in the equalization basin prior to primary coagulation; verify inlet quality before chemical dosing.',
    reason: 'Prevent shock loading of bio-reactors from concentrated dye-bath discharge; avoid overdosing without measured inlet data.',
    evidence: [
      `Dye Class: ${recipe.dye_class || 'Reactive'}`,
      hasInletCod ? `Measured inlet COD: ${wastewater.COD} mg/L` : 'Inlet COD: not measured',
      hasInletPh ? `Measured inlet pH: ${wastewater.pH}` : 'Inlet pH: not measured',
      kbDosingNote,
    ],
    dosing: {
      status: dosingStatus,
      recommendation: dosingRecommendation,
      warning: dosingWarning,
      required_inputs: ['jar_test_data', 'measured_inlet_COD', 'measured_inlet_pH'],
    },
    strategies,
    rules: evaluatedRules,
    model_status: 'not_available',
    data_sources: {
      rule_base: 'rule_base.json (human_validation_status = pending)',
      dosing_matrix: kbDosingAvailable ? 'etp_chemical_dosing_rules.json (engineering reference ranges)' : 'unavailable',
    },
    warnings: [
      'Rule evaluation uses KB domain rules with pending human validation status.',
      dosingStatus === 'insufficient_data'
        ? 'No measured/jar-test inputs — chemical dosing not calculated.'
        : 'Dosage guidance is a KB reference range; exact operating dose must be locked by jar-test calibration.',
    ],
    assumptions: [
      'Assumes standard continuous-flow ETP with equalization, chemical coagulation/flocculation, and aerobic biological treatment.',
      'Equalization basin residence time >= 8 hours.',
    ],
    limitations: [
      'Advisory decision support only. Does not auto-control plant valves or pumps.',
      'Regulatory compliance requires official laboratory effluent testing.',
      'Precise coagulant/flocculant point dosage cannot be computed without jar-test and verified inlet data.',
    ],
  };
}

module.exports = { evaluateEtpDecision };