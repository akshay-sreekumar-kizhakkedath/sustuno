// ETP Decision Support Routes
const express = require('express');
const router = express.Router();
const { evaluateEtpDecision } = require('../services/etp/etpDecisionEngine');

// POST /api/etp/recommend
router.post('/recommend', (req, res) => {
  try {
    const decision = evaluateEtpDecision(req.body || {});
    res.json({
      success: true,
      data: decision
    });
  } catch (err) {
    console.error('Error generating ETP recommendation:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'ETP_RECOMMENDATION_ERROR',
        message: err.message || 'Failed to generate ETP recommendation'
      }
    });
  }
});

// GET /api/etp/rules
router.get('/rules', (req, res) => {
  try {
    const decision = evaluateEtpDecision({});
    res.json({
      success: true,
      data: {
        total_rules: decision.rules.length,
        rules: decision.rules,
        note: 'All domain rules currently have human_validation_status=pending and operate in advisory mode.'
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ETP_RULES_ERROR',
        message: err.message || 'Failed to retrieve ETP rules'
      }
    });
  }
});

module.exports = router;
