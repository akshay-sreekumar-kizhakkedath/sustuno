#!/usr/bin/env python3
"""
SUSTUNO Model Evaluator
Evaluates a trained model artifact against a test dataset manifest.
Computes MAE, RMSE, R² per target axis (L*, a*, b*) and Delta-E distribution.
"""

import sys
import json
import numpy as np
from pathlib import Path

def evaluate_model(model_meta_path, test_dataset_path):
    print("=== SUSTUNO MODEL EVALUATOR ===")

    if not model_meta_path.exists():
        print(f"ERROR: Model metadata not found: {model_meta_path}")
        return None

    if not test_dataset_path.exists():
        print(f"ERROR: Test dataset not found: {test_dataset_path}")
        return None

    with open(model_meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)

    with open(test_dataset_path, 'r', encoding='utf-8') as f:
        ds = json.load(f)

    samples = ds.get('data', [])
    print(f"Evaluating Model Version: {meta.get('model_version')}")
    print(f"Test Samples Count: {len(samples)}")

    if len(samples) == 0:
        print("No test samples available for evaluation.")
        return {
            "status": "no_test_samples",
            "model_version": meta.get('model_version'),
            "samples_count": 0
        }

    import joblib
    import pandas as pd
    from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

    artifact_path = Path(meta.get('artifact_path'))
    if not artifact_path.exists():
        print(f"ERROR: Joblib artifact not found at {artifact_path}")
        return None

    bundle = joblib.load(artifact_path)
    preprocessor = bundle['preprocessor']
    model = bundle['model']

    X_rows = []
    y_actual = []

    for s in samples:
        mat = s.get('material', {})
        dye_rec = s.get('dye_recipe', {})
        proc = s.get('process', {})
        lab = s.get('measured_lab', {})

        dyes = dye_rec.get('dyes', [])
        total_dye_conc = sum(float(d.get('concentration') or 0) for d in dyes)

        X_rows.append({
            'fiber_composition': str(mat.get('fiber_composition', 'unknown')).lower(),
            'fabric_type': str(mat.get('fabric_type', 'unknown')).lower(),
            'gsm': float(mat.get('gsm') or 180),
            'fabric_weight_kg': float(mat.get('fabric_weight_kg') or 100),
            'dye_class': str(dye_rec.get('dye_class', 'unknown')).lower(),
            'total_dye_concentration': total_dye_conc,
            'num_dyes': len(dyes),
            'liquor_ratio': float(proc.get('liquor_ratio') or 10.0),
            'temperature': float(proc.get('temperature') or 60.0),
            'time_minutes': float(proc.get('time_minutes') or 60.0),
            'ph': float(proc.get('ph') or 7.0),
            'machine': str(proc.get('machine', 'unknown')).lower()
        })
        y_actual.append([float(lab['L']), float(lab['a']), float(lab['b'])])

    df_X = pd.DataFrame(X_rows)
    X_trans = preprocessor.transform(df_X)
    preds = model.predict(X_trans)
    y_act = np.array(y_actual)

    mae = [mean_absolute_error(y_act[:, i], preds[:, i]) for i in range(3)]
    rmse = [root_mean_squared_error(y_act[:, i], preds[:, i]) for i in range(3)]
    r2 = [r2_score(y_act[:, i], preds[:, i]) for i in range(3)]

    delta_es = np.sqrt(np.sum((y_act - preds) ** 2, axis=1))

    results = {
        "model_version": meta.get('model_version'),
        "samples_evaluated": len(samples),
        "metrics": {
            "L_axis": {"MAE": mae[0], "RMSE": rmse[0], "R2": r2[0]},
            "a_axis": {"MAE": mae[1], "RMSE": rmse[1], "R2": r2[1]},
            "b_axis": {"MAE": mae[2], "RMSE": rmse[2], "R2": r2[2]},
            "delta_e_76": {
                "mean": float(np.mean(delta_es)),
                "median": float(np.median(delta_es)),
                "max": float(np.max(delta_es)),
                "pct_le_1_0": float(np.mean(delta_es <= 1.0) * 100),
                "pct_le_2_0": float(np.mean(delta_es <= 2.0) * 100)
            }
        }
    }

    print(json.dumps(results, indent=2))
    return results

if __name__ == '__main__':
    ml_dir = Path(__file__).resolve().parents[1]
    meta_p = ml_dir / 'models' / 'active_model.json'
    ds_p = ml_dir / 'data' / 'dye_shade_dataset_v001.json'
    evaluate_model(meta_p, ds_p)
