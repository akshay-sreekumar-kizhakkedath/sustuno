# SUSTUNO Machine Learning Pipeline (Dye Shade Prediction)

## Architecture Overview

The SUSTUNO ML architecture provides a clean, decoupled path from real dyeing experiments to model training and optimizer inference.

```
       Supabase DB (dye_batches + dye_batch_shade_results)
                              │
                              ▼
                dash board/ml/data/extract_dye_batches.py
                              │
                              ▼
                 dye_shade_dataset_v001.json
                              │
                              ▼
               dash board/ml/training/train_shade_model.py
          (Refuses to train if valid samples < 200)
                              │
                              ▼
                dash board/ml/models/active_model/
                              │
                              ▼
          Express Backend (shadePredictionModel.js)
```

---

## Directory Structure

- `data/`
  - `extract_dye_batches.py`: Extracts verified supervised records from Supabase.
  - `validate_dataset.py`: Validates dataset files against `feature_schema.json`.
  - `feature_schema.json`: Versioned feature and target schema definition.
- `models/`: Stores trained model artifacts (`model.joblib`, `model_meta.json`, `active_model.json`).
- `training/`
  - `train_shade_model.py`: Supervised Multi-Output Regressor training pipeline.
  - `evaluate_shade_model.py`: Model evaluation script.
- `inference/`
  - `predict_shade.py`: Inference CLI runner.

---

## Strict Training Data Rules

1. **Supervised Data Only**: Only real dyeing batches with spectrophotometer-measured $L^*a^*b^*$ results are included.
2. **Exclusion of Non-Supervised Data**: Reference recipes, theoretical formulas, compatibility rules, and KB facts are strictly excluded.
3. **Training Threshold**: Training is **automatically blocked** when valid sample count is below 200.
4. **Fallback Behavior**: When training is blocked or no model exists, `model_status` remains `not_available`.

---

## Executing the Pipeline

```bash
# 1. Extract dataset from connected Supabase DB
python "dash board/ml/data/extract_dye_batches.py"

# 2. Validate extracted dataset
python "dash board/ml/data/validate_dataset.py"

# 3. Execute training script (refuses to train when samples < 200)
python "dash board/ml/training/train_shade_model.py"

# 4. Run inference test
python "dash board/ml/inference/predict_shade.py" --input "{\"fabric\": \"cotton\", \"dye_class\": \"reactive\"}"
```
