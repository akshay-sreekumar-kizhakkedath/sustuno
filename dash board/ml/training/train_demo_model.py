#!/usr/bin/env python3
"""
Train the SUSTUNO DEMO shade model on the labeled synthetic dataset.

Writes ONLY to dash board/ml/models/demo/ — never touches the production
models/active_model.json. The demo model is served solely when
SUSTUNO_DEMO_MODEL=1 is set, and always reports model_status='demo_synthetic'.
"""

import sys
from pathlib import Path

TRAINING_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(TRAINING_DIR))

from train_shade_model import train_model  # noqa: E402

ml_dir = TRAINING_DIR.parent
demo_dataset = ml_dir / "data" / "demo_synthetic_dataset.json"
demo_models_dir = ml_dir / "models" / "demo"

if __name__ == "__main__":
    print("=== SUSTUNO DEMO MODEL TRAINER (synthetic data, non-production) ===")
    train_model(demo_dataset, demo_models_dir, min_samples=200, force=False)
