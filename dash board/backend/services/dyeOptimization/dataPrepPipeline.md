# Data-Preparation Pipeline — Model Training Blocked
Created: 2026-09-13
Status: BLOCKED (insufficient supervised data)

## Block reason
No supervised dyeing dataset exists containing both:
- validated recipe/process inputs
- measured L* / a* / b* outputs

Reference datasets inspected (Standard_Recipes_Master_Dataset, KB source JSONs) contain recipes and rules, not measured shade outcomes.

## Pipeline prepared (ready when data arrives)
- Input schema defined (fiber, fabric, GSM, dye IDs/% OWF, chemicals, liquor ratio, temperature, time, pH, machine)
- Target schema defined (L*, a*, b*)
- Feature engineering ready (encode dye class, normalize process ranges, one-hot machine if needed)
- Model family prepared: Gradient Boosting (XGBoost/LightGBM) — select based on dataset size after collection
- Validation method: train/val/test split with group-aware splitting if batches are related; evaluate MAE, RMSE, R², ΔE distribution
- Persistence plan: model_version file + feature schema + metrics log

## Do not train yet
Until confirmed supervised rows ≥ minimum threshold (recommended 200+ batches), the pipeline remains blocked and shadePredictionModel returns model_status = not_available.
