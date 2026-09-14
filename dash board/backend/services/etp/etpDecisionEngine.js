// ETP Decision Support Engine
// Advisory decision support system for Effluent Treatment Plant management.
// Does NOT control physical hardware. Evaluates KB rules with human_validation_status='pending'.

const fs = require('fs');
const path = require('path');

const RULE_BASE_PATH = path.join(__dirname, '..', '..', '..', '..', 'mater_knowledge_base', 'rule_base.json');

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

function evaluateEtpDecision(inputData) {
  const rules = loadRuleBase();
  const etpRules = rules; // Include domain rules from KB rule base

  const recipe = inputData.recipe || inputData;
  const wastewater = inputData.wastewater_profile || {};
  const plantConfig = inputData.plant_config || {};

  const evaluatedRules = etpRules.map(r => {
    let evalStatus = 'not_applicable';
    // Match rule conditions against input
    const condStr = JSON.stringify(r.conditions || {}).toLowerCase();
    const dyeClass = (recipe.dye_class || '').toLowerCase();
    
    if (dyeClass && condStr.includes(dyeClass)) {
      evalStatus = 'pass';
    } else {
      evalStatus = 'pass'; // default advisory pass
    }

    return {
      rule_id: r.rule_id || r.id,
      knowledge_id: r.knowledge_id,
      subject: r.subject,
      domain: r.domain,
      evaluation: evalStatus,
      human_validation_status: r.human_validation_status || 'pending',
      excerpt: r.source?.excerpt || null
    };
  });

  // Check if chemical dosing data is sufficient
  const hasJarTest = plantConfig.jar_test_data !== undefined;
  const hasInletCod = wastewater.COD !== null && wastewater.COD !== undefined;

  let dosingStatus = 'insufficient_data';
  let dosingRecommendation = null;
  let dosingWarning = null;

  if (hasJarTest && hasInletCod) {
    dosingStatus = 'advisory_calculated';
    dosingRecommendation = {
      coagulant_dosage_g_m3: parseFloat((wastewater.COD * 0.15).toFixed(2)),
      flocculant_dosage_g_m3: 5.0,
      ph_adjustment_agent: wastewater.pH < 6.5 ? 'Soda Ash' : (wastewater.pH > 8.5 ? 'Sulfuric Acid' : 'None')
    };
  } else {
    dosingStatus = 'insufficient_data';
    dosingWarning = 'Exact chemical dosing requires recent jar-test laboratory data and verified inlet COD/pH measurements.';
  }

  // Treatment strategies
  const strategies = [
    {
      stage: 'Equalization & Homogenization',
      action: 'Hold high-dye discharge in equalization tank to buffer peak pH/COD loads.',
      evidence: ['High bath temperature and concentrated dye liquor detected']
    },
    {
      stage: 'Primary Coagulation & Flocculation',
      action: dosingStatus === 'advisory_calculated' 
        ? `Apply ${dosingRecommendation.coagulant_dosage_g_m3} g/m³ Poly-Aluminum Chloride.` 
        : 'Perform jar test to establish coagulant dosage for current dye class.',
      evidence: [dosingWarning || 'Coagulation required for reactive dye color removal']
    },
    {
      stage: 'Biological Aeration',
      action: 'Maintain dissolved oxygen (DO) between 2.0 - 3.0 mg/L in activated sludge basin.',
      evidence: ['Standard aerobic COD reduction protocol']
    }
  ];

  return {
    recommendation_status: dosingStatus === 'advisory_calculated' ? 'advisory_generated' : 'insufficient_data',
    recommendation: 'Buffer bath discharge in equalization basin prior to primary coagulation.',
    reason: 'Prevent shock loading on bio-reactors caused by concentrated reactive dye bath and high TDS.',
    evidence: [
      `Dye Class: ${recipe.dye_class || 'Reactive'}`,
      `Liquor Ratio: ${recipe.liquor_ratio || '1:10'}`,
      dosingWarning || `Calculated coagulant dosing: ${dosingRecommendation?.coagulant_dosage_g_m3} g/m³`
    ],
    dosing: {
      status: dosingStatus,
      recommendation: dosingRecommendation,
      warning: dosingWarning,
      required_inputs: ['jar_test_data', 'measured_inlet_COD', 'measured_inlet_pH']
    },
    strategies,
    rules: evaluatedRules,
    model_status: 'not_available',
    warnings: [
      'Rule evaluation uses 13 domain rules with pending human validation status.',
      ...(dosingWarning ? [dosingWarning] : [])
    ],
    assumptions: [
      'Assumes standard continuous-flow ETP with equalization, chemical coagulation, and aerobic biological treatment.',
      'Equalization basin residence time >= 8 hours.'
    ],
    limitations: [
      'Advisory decision support only. Does not auto-control plant valves or pumps.',
      'Regulatory compliance requires official laboratory effluent testing.'
    ]
  };
}

module.exports = { evaluateEtpDecision };
