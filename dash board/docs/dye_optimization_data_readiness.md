# Dye Optimization Data Readiness Report
Date: 2026-09-13
Project: SUSTUNO — AI DYE OPTIMIZATION
Status: ARCHITECTURE VALIDATED / NOT TRAINING-READY

## 1. Implementation verified
- All 9 optimizer services present and import-correct.
- Routes extended with POST /api/optimization/dye-recipe and GET /dye-recipe/:id.
- Tests pass (input validation, rule loading, candidate generation, ΔE, model unavailable, rule evaluation).
- No destructive DB changes; dye_opt_sessions / inputs / outputs / constraints reused.

## 2. DB schema reused (no duplicates)
Tables used or available:
- dye_opt_sessions (exists)
- dye_opt_inputs (exists)
- dye_opt_outputs (exists)
- dye_opt_constraints (exists)
- batches (exists; referenced by dye_opt_sessions)
No new tables required for prototype operation.
Schema gap noted: full optimization_request / result reuse requires mapping to session-based tables; smallest future improvement is adding structured input/result JSON columns or dedicated optimization_result / optimization_request tables.

## 3. Reference data counts
- master_knowledge_base.json knowledge_records: ~many (used for filtering)
- Standard_Recipes_Master_Dataset.json recipes: 5 standard recipes (REC-COT-001, REC-VAT-005, REC-PC-004, REC-NYL-003, REC-PES-002)
- rule_base.json rules: 13 (all pending human_validation_status)
- Database dye/recipe tables: not fully populated with industrial-scale inventory in this audit; optimizer relies on KB/reference recipes.

## 4. Supervised training data assessment
Dataset directories inspected:
- AI Training dataset/JSON_Files/Standard_Recipes_Master_Dataset.json — reference recipes, not measured experiments
- AI Training dataset/JSON_Files/<recipe IDs> — standard recipes with process parameters but NO measured L*a*b* outputs
- AI Training dataset/data p/ — dyeing rules, compatibility charts, machine constraints, standards (not training data)
- mater_knowledge_base/source_json/ — referenced source data (same nature)

Result: NO supervised dyeing dataset exists with:
- recipe/process inputs + measured L* / a* / b* outputs.
Supervised samples available: ~0 genuine measured batches.

## 5. Missing training fields
- measured L*
- measured a*
- measured b*
- batch-level dye quantities with confirmed inputs
- confirmed process parameters linked to shade outcomes
- machine-linkage to measured results

## 6. Data quality
- Reference recipes are standard/prototype, not production batch records.
- No duplicates of training rows because no training rows exist.
- Units consistent in reference recipes (% OWF, g/L, kg, °C, minutes, pH).
- No synthetic measurement data fabricated.

## 7. Training readiness
TRAINING_READY = NO.
Reason: sufficient supervised dyeing data with measured L*a*b* is absent.

## 8. Current model status
- shadePredictionModel.status = not_available
- No fake predictions implemented.
- Pipeline clearly distinguishes MODEL AVAILABLE vs MODEL NOT AVAILABLE.

## 9. Recommended data collection plan
To become training-ready, collect per batch:
1. Fiber / fabric / GSM / weight
2. Dye IDs + % OWF
3. Chemical IDs + dosage
4. Liquor ratio / temperature / time / pH
5. Machine
6. Measured L* / a* / b* from color measurement instrument
Target: minimum several hundred confirmed batches across dye classes and fibers for initial gradient-boosting model.

## 10. Next exact step
Do NOT train a fake model. Build data collection pipeline / integrate with lab measurement system. Once 200–500 supervised rows exist, train XGBoost/LightGBM with train/val/test split and document metrics.
