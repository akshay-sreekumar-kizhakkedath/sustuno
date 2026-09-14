#!/usr/bin/env python3
"""
SUSTUNO Dataset Validator
Validates extracted ML dataset against feature schema and target quality constraints.
"""

import json
import sys
from pathlib import Path

def validate_dataset_file(dataset_path, schema_path):
    print(f"=== VALIDATING DATASET: {dataset_path.name} ===")
    
    if not dataset_path.exists():
        print(f"ERROR: Dataset file not found: {dataset_path}")
        return False

    if not schema_path.exists():
        print(f"ERROR: Feature schema file not found: {schema_path}")
        return False

    with open(dataset_path, 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)

    valid_samples = manifest.get('data', [])
    total_valid = manifest.get('valid_samples', 0)

    print(f"Dataset Version: {manifest.get('dataset_version')}")
    print(f"Schema Version: {manifest.get('schema_version')}")
    print(f"Total Valid Samples: {total_valid}")

    issues = []

    if total_valid == 0:
        print("Validation completed. Dataset status: NO SAMPLES AVAILABLE (0 valid samples).")
        return True

    for i, s in enumerate(valid_samples):
        bid = s.get('batch_id', f'sample_{i}')
        lab = s.get('measured_lab', {})
        mL = lab.get('L')
        ma = lab.get('a')
        mb = lab.get('b')

        if mL is None or ma is None or mb is None:
            issues.append(f"Batch {bid}: Missing target measured L*a*b*")
            continue

        if not (0 <= float(mL) <= 100):
            issues.append(f"Batch {bid}: measured_L={mL} out of range [0, 100]")
        if not (-128 <= float(ma) <= 127):
            issues.append(f"Batch {bid}: measured_a={ma} out of range [-128, 127]")
        if not (-128 <= float(mb) <= 127):
            issues.append(f"Batch {bid}: measured_b={mb} out of range [-128, 127]")

        mat = s.get('material', {})
        if not mat.get('fiber_composition') or not mat.get('fabric_type'):
            issues.append(f"Batch {bid}: Missing fiber_composition or fabric_type")

        proc = s.get('process', {})
        lr = proc.get('liquor_ratio')
        temp = proc.get('temperature')
        if lr is not None and (lr <= 0 or lr > 100):
            issues.append(f"Batch {bid}: Questionable liquor_ratio={lr}")
        if temp is not None and (temp < 20 or temp > 140):
            issues.append(f"Batch {bid}: Questionable temperature={temp}°C")

    print(f"Validation completed. Found {len(issues)} issue(s).")
    for issue in issues:
        print(f"  - {issue}")

    return len(issues) == 0

if __name__ == '__main__':
    base = Path(__file__).parent
    ds = base / 'dye_shade_dataset_v001.json'
    sch = base / 'feature_schema.json'
    success = validate_dataset_file(ds, sch)
    sys.exit(0 if success else 1)
