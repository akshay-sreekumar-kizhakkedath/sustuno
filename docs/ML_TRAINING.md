# SUSTUNO — Machine Learning Training Pipeline

## Supervised Learning Model
- **Target**: Predicts actual measured spectrophotometer $L^*a^*b^*$ coordinates from pre-dyeing material, recipe, and process inputs.
- **Current Status**: `DATA-DEPENDENT` / `NOT_AVAILABLE`
- **Supervised Samples Count**: `0`
- **Training Readiness**: `NO`
- **Threshold Rule**: Training is **automatically refused** (exit code 2) when valid supervised sample count is below 200.

## Execution
```bash
python "dash board/ml/data/extract_dye_batches.py"
python "dash board/ml/data/validate_dataset.py"
python "dash board/ml/training/train_shade_model.py"
```

## Demo mode (SUSTUNO_DEMO_MODEL=1, non-production)

No real measured dyeing data exists yet (0 supervised samples), so the production model is and remains not_available. For UI/flow testing, an isolated demo loop exists:

- python dash board/ml/data/generate_demo_synthetic_dataset.py -> 320 labeled SYNTHETIC samples (manifest demo_synthetic_dataset_v001; never touches Supabase).
- python dash board/ml/training/train_demo_model.py -> artifact under dash board/ml/models/demo/ only. Production models/active_model.json is never written.
- With SUSTUNO_DEMO_MODEL=1, inference and GET /api/ml/status report model_status=demo_synthetic with confidence=null and an explicit synthetic-data note. Without the flag, every path returns not_available.
- Optimizer batch inference runs all candidates in ONE Python process (stdin JSON array); single-predict CLI unchanged. A numpy-import bug in predict_shade.py was fixed in this phase.

Demo predictions are illustrative only and must never be used for production dyeing or presented as validated performance.

