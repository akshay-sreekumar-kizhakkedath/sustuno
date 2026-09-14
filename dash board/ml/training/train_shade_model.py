#!/usr/bin/env python3
"""
SUSTUNO Dye Shade Model Training Script
Trains a supervised Multi-Output Regressor to predict measured L*a*b* from dyeing recipe and process parameters.
REFUSES to train if dataset lacks sufficient validated supervised samples.
"""

import sys
import json
import argparse
import datetime
from pathlib import Path
import numpy as np

# Minimum samples required before training is permitted
DEFAULT_MIN_SAMPLES = 200

def train_model(dataset_path, model_out_dir, min_samples=DEFAULT_MIN_SAMPLES, force=False):
    print("=== SUSTUNO DYE SHADE MODEL TRAINER ===")
    
    if not dataset_path.exists():
        print(f"ERROR: Dataset manifest not found at: {dataset_path}")
        print("Run `python dash board/ml/data/extract_dye_batches.py` first.")
        sys.exit(1)

    with open(dataset_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    valid_samples = manifest.get('valid_samples', 0)
    data = manifest.get('data', [])

    print(f"Dataset Version: {manifest.get('dataset_version')}")
    print(f"Extraction Timestamp: {manifest.get('extraction_timestamp')}")
    print(f"Valid Supervised Samples Available: {valid_samples}")
    print(f"Minimum Configured Training Threshold: {min_samples}")

    # CRITICAL READINESS CHECK: Refuse training if sample count is below minimum
    if valid_samples < min_samples and not force:
        print("\n" + "=" * 65)
        print(f"BLOCKED: Model training REFUSED.")
        print(f"Reason: Dataset contains {valid_samples} valid supervised samples.")
        print(f"Required minimum threshold: {min_samples} validated dyeing batches.")
        print("Reference recipes and unmeasured KB facts CANNOT be used for training.")
        print("Model status will remain 'not_available' until real experiment data is collected.")
        print("=" * 65 + "\n")
        
        # Save training refusal report
        report = {
            "status": "refused",
            "reason": f"Insufficient supervised samples ({valid_samples}/{min_samples})",
            "valid_samples": valid_samples,
            "minimum_required": min_samples,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "model_status": "not_available"
        }
        
        out_report = model_out_dir / "last_training_report.json"
        model_out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_report, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
            
        sys.exit(2) # Exit code 2 indicates dataset insufficient refusal

    print("\n[INFO] Valid sample count satisfied. Preparing training dataset...")

    import joblib
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.multioutput import MultiOutputRegressor
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    # Feature extraction & target extraction logic
    X_rows = []
    y_rows = []

    for s in data:
        mat = s.get('material', {})
        dye_rec = s.get('dye_recipe', {})
        chem_rec = s.get('chemical_recipe', {})
        proc = s.get('process', {})
        lab = s.get('measured_lab', {})

        # Extract features
        fiber = str(mat.get('fiber_composition', 'unknown')).lower()
        fabric = str(mat.get('fabric_type', 'unknown')).lower()
        gsm = float(mat.get('gsm') or 180)
        weight_kg = float(mat.get('fabric_weight_kg') or 100)
        dye_class = str(dye_rec.get('dye_class', 'unknown')).lower()

        # Dyes total concentration
        dyes = dye_rec.get('dyes', [])
        total_dye_conc = sum(float(d.get('concentration') or 0) for d in dyes)
        num_dyes = len(dyes)

        # Process features
        liquor_ratio = float(proc.get('liquor_ratio') or 10.0)
        temperature = float(proc.get('temperature') or 60.0)
        time_mins = float(proc.get('time_minutes') or 60.0)
        ph = float(proc.get('ph') or 7.0)
        machine = str(proc.get('machine', 'unknown')).lower()

        X_rows.append({
            'fiber_composition': fiber,
            'fabric_type': fabric,
            'gsm': gsm,
            'fabric_weight_kg': weight_kg,
            'dye_class': dye_class,
            'total_dye_concentration': total_dye_conc,
            'num_dyes': num_dyes,
            'liquor_ratio': liquor_ratio,
            'temperature': temperature,
            'time_minutes': time_mins,
            'ph': ph,
            'machine': machine
        })

        y_rows.append([float(lab['L']), float(lab['a']), float(lab['b'])])

    X_array = X_rows
    y_array = np.array(y_rows)

    # Define ColumnTransformer
    cat_cols = ['fiber_composition', 'fabric_type', 'dye_class', 'machine']
    num_cols = ['gsm', 'fabric_weight_kg', 'total_dye_concentration', 'num_dyes', 'liquor_ratio', 'temperature', 'time_minutes', 'ph']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)
        ]
    )

    # Convert X_dict array using DictVectorizer or pandas DataFrame
    import pandas as pd
    df_X = pd.DataFrame(X_rows)
    X_trans = preprocessor.fit_transform(df_X)

    # Train Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    model = MultiOutputRegressor(rf)
    model.fit(X_trans, y_array)

    # Evaluate on train
    preds = model.predict(X_trans)
    
    mae_L = mean_absolute_error(y_array[:, 0], preds[:, 0])
    mae_a = mean_absolute_error(y_array[:, 1], preds[:, 1])
    mae_b = mean_absolute_error(y_array[:, 2], preds[:, 2])

    r2_L = r2_score(y_array[:, 0], preds[:, 0])
    r2_a = r2_score(y_array[:, 1], preds[:, 1])
    r2_b = r2_score(y_array[:, 2], preds[:, 2])

    # Delta E 76
    delta_es = np.sqrt(np.sum((y_array - preds) ** 2, axis=1))
    mean_de = float(np.mean(delta_es))
    median_de = float(np.median(delta_es))
    max_de = float(np.max(delta_es))
    pct_under_1 = float(np.mean(delta_es <= 1.0) * 100)
    pct_under_2 = float(np.mean(delta_es <= 2.0) * 100)

    version_str = "dye_shade_model_v001"
    model_dir = model_out_dir / version_str
    model_dir.mkdir(parents=True, exist_ok=True)

    # Save pipeline
    artifact_path = model_dir / "model.joblib"
    joblib.dump({
        "preprocessor": preprocessor,
        "model": model,
        "feature_cols": df_X.columns.tolist()
    }, artifact_path)

    meta = {
        "model_version": version_str,
        "dataset_version": manifest.get('dataset_version'),
        "feature_schema_version": "v1.0.0",
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "model_type": "MultiOutputRegressor(RandomForestRegressor)",
        "number_of_training_samples": valid_samples,
        "metrics": {
            "mae": {"L": mae_L, "a": mae_a, "b": mae_b},
            "r2": {"L": r2_L, "a": r2_a, "b": r2_b},
            "delta_e_76": {
                "mean": mean_de,
                "median": median_de,
                "max": max_de,
                "pct_le_1_0": pct_under_1,
                "pct_le_2_0": pct_under_2
            }
        },
        "artifact_path": str(artifact_path)
    }

    with open(model_dir / "model_meta.json", 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)

    # Also update active model pointer
    active_link = model_out_dir / "active_model.json"
    with open(active_link, 'w', encoding='utf-8') as f:
        json.dump({"active_version": version_str, "status": "available", "meta": meta}, f, indent=2)

    print(f"\n[SUCCESS] Model trained and saved to: {model_dir}")
    print(f"  Mean Delta-E 76: {mean_de:.4f}")
    print(f"  Samples trained on: {valid_samples}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train SUSTUNO Dye Shade Model")
    parser.add_argument('--dataset', type=str, default=None, help="Path to dataset JSON")
    parser.add_argument('--min-samples', type=int, default=DEFAULT_MIN_SAMPLES, help="Minimum sample threshold")
    parser.add_argument('--force', action='store_true', help="Force training despite low samples")
    args = parser.parse_args()

    ml_dir = Path(__file__).resolve().parents[1]
    ds_path = Path(args.dataset) if args.dataset else ml_dir / 'data' / 'dye_shade_dataset_v001.json'
    models_dir = ml_dir / 'models'

    train_model(ds_path, models_dir, min_samples=args.min_samples, force=args.force)
