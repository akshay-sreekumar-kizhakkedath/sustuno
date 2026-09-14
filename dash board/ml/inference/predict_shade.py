#!/usr/bin/env python3
"""
SUSTUNO Model Inference CLI / Runner
Executes shade prediction using the active model artifact.
Returns model_status='not_available' if no trained artifact exists.
"""

import sys
import json
import argparse
import os
from pathlib import Path

import numpy as np

# Demo mode: serve the isolated synthetic demo model ONLY when explicitly enabled.
# Production path is unchanged and stays not_available without a real trained model.
DEMO_ENABLED = os.getenv("SUSTUNO_DEMO_MODEL") == "1"


def resolve_active_meta(ml_dir):
    if DEMO_ENABLED:
        demo_meta = ml_dir / "models" / "demo" / "active_model.json"
        if demo_meta.exists():
            return demo_meta, True
    return ml_dir / "models" / "active_model.json", False

def predict_shade_from_features(input_data):
    ml_dir = Path(__file__).resolve().parents[1]
    active_meta_file, is_demo = resolve_active_meta(ml_dir)

    # 1. Check if an active model exists
    if not active_meta_file.exists():
        return {
            "model_status": "not_available",
            "model_version": "none",
            "predicted_lab": { "L": None, "a": None, "b": None },
            "confidence": None,
            "note": "No trained shade-prediction model exists yet."
        }

    try:
        with open(active_meta_file, 'r', encoding='utf-8') as f:
            active_info = json.load(f)

        meta = active_info.get('meta', {})
        version = active_info.get('active_version', 'none')
        artifact_path = Path(meta.get('artifact_path', ''))

        if not artifact_path.exists():
            return {
                "model_status": "not_available",
                "model_version": version,
                "predicted_lab": { "L": None, "a": None, "b": None },
                "confidence": None,
                "note": f"Artifact file missing at {artifact_path}"
            }

        import joblib
        import pandas as pd

        bundle = joblib.load(artifact_path)
        preprocessor = bundle['preprocessor']
        model = bundle['model']

        df_in = pd.DataFrame([build_feature_row(input_data)])
        X_trans = preprocessor.transform(df_in)
        preds = model.predict(X_trans)[0]

        return {
            "model_status": "demo_synthetic" if is_demo else "available",
            "model_version": (version + "-demo") if is_demo else version,
            "predicted_lab": {
                "L": float(np.round(preds[0], 2)),
                "a": float(np.round(preds[1], 2)),
                "b": float(np.round(preds[2], 2))
            },
            "confidence": None,  # Confidence is null unless calibrated uncertainty model is used
            "demo": is_demo,
            "note": "DEMO prediction from synthetic data; not for production use." if is_demo else None
        }
    except Exception as e:
        return {
            "model_status": "error",
            "model_version": "unknown",
            "predicted_lab": { "L": None, "a": None, "b": None },
            "confidence": None,
            "error": str(e)
        }


def build_feature_row(input_data):
        # Format input feature row (module-level helper used by single + batch inference)
        mat = input_data.get('material', {}) or input_data
        dye_rec = input_data.get('dye_recipe', {}) or input_data
        proc = input_data.get('process', {}) or input_data

        dyes = dye_rec.get('dyes') or input_data.get('dyes') or input_data.get('dye_quantities') or []
        total_dye_conc = 0.0
        for d in dyes:
            total_dye_conc += float(
                d.get('concentration') or d.get('percentage_owf')
                or d.get('quantity') or d.get('quantity_kg') or 0
            )

        return {
            'fiber_composition': str(mat.get('fiber_composition') or input_data.get('fabric') or 'cotton').lower(),
            'fabric_type': str(mat.get('fabric_type') or input_data.get('fabric') or 'woven').lower(),
            'gsm': float(mat.get('gsm') or input_data.get('gsm') or 180),
            'fabric_weight_kg': float(mat.get('fabric_weight_kg') or input_data.get('fabric_weight_kg') or 100),
            'dye_class': str(dye_rec.get('dye_class') or input_data.get('dye_class') or 'reactive').lower(),
            'total_dye_concentration': total_dye_conc,
            'num_dyes': len(dyes),
            'liquor_ratio': float(proc.get('liquor_ratio') or input_data.get('liquor_ratio') or 10.0),
            'temperature': float(proc.get('temperature') or input_data.get('temperature') or 60.0),
            'time_minutes': float(proc.get('time_minutes') or input_data.get('time_minutes') or 60.0),
            'ph': float(proc.get('ph') or input_data.get('ph') or 7.0),
            'machine': str(proc.get('machine') or proc.get('machine_id') or input_data.get('machine_id') or input_data.get('machine') or 'unknown').lower()
        }


def predict_shade_batch(input_list):
    """Batch inference in a single model load. Returns {'results': [...]}, or
    a not_available envelope when no model artifact exists."""
    ml_dir = Path(__file__).resolve().parents[1]
    active_meta_file, is_demo = resolve_active_meta(ml_dir)

    if not active_meta_file.exists():
        return {
            "model_status": "not_available",
            "model_version": "none",
            "results": [],
            "confidence": None,
            "note": "No trained shade-prediction model exists yet."
        }

    try:
        with open(active_meta_file, 'r', encoding='utf-8') as f:
            active_info = json.load(f)

        meta = active_info.get('meta', {})
        version = active_info.get('active_version', 'none')
        artifact_path = Path(meta.get('artifact_path', ''))

        if not artifact_path.exists():
            return {
                "model_status": "not_available",
                "model_version": version,
                "results": [],
                "confidence": None,
                "note": f"Artifact file missing at {artifact_path}"
            }

        import joblib
        import pandas as pd

        bundle = joblib.load(artifact_path)
        preprocessor = bundle['preprocessor']
        model = bundle['model']

        rows = [build_feature_row(item) for item in input_list]
        df_in = pd.DataFrame(rows)
        X_trans = preprocessor.transform(df_in)
        preds = model.predict(X_trans)

        out_version = (version + "-demo") if is_demo else version
        return {
            "model_status": "demo_synthetic" if is_demo else "available",
            "model_version": out_version,
            "results": [
                {"L": float(np.round(p[0], 2)), "a": float(np.round(p[1], 2)), "b": float(np.round(p[2], 2))}
                for p in preds
            ],
            "confidence": None,
            "demo": is_demo,
            "note": "DEMO predictions from synthetic data; not for production use." if is_demo else None
        }
    except Exception as e:
        return {
            "model_status": "error",
            "model_version": "unknown",
            "results": [],
            "confidence": None,
            "error": str(e)
        }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Predict dye shade from input JSON")
    parser.add_argument('--input', type=str, default=None, help="Input JSON string")
    args = parser.parse_args()

    if args.input:
        in_obj = json.loads(args.input)
    else:
        # Read stdin if available
        stdin_str = sys.stdin.read().strip()
        in_obj = json.loads(stdin_str) if stdin_str else {}

    if isinstance(in_obj, list):
        res = predict_shade_batch(in_obj)
    else:
        res = predict_shade_from_features(in_obj)
    print(json.dumps(res, indent=2))
