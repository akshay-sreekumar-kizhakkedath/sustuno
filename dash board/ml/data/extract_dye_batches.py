#!/usr/bin/env python3
"""
SUSTUNO Dye Shade Dataset Extractor
Extracts and validates supervised dye batch records from Supabase DB.
Strictly excludes reference recipes, synthetic rows, incomplete batches, and missing L*a*b* records.
"""

import os
import json
import datetime
from pathlib import Path

# Load .env variables from dash board/backend/.env
def load_env():
    backend_env = Path(__file__).resolve().parents[2] / 'backend' / '.env'
    if backend_env.exists():
        with open(backend_env, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")

load_env()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

def fetch_supabase_table(table_name):
    """Fetches all rows from a Supabase table via REST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    import urllib.request
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/{table_name}?select=*"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data
    except Exception as e:
        print(f"Notice: fetch {table_name} returned: {e}")
        return []

def extract_dataset():
    print("=== SUSTUNO DATASET EXTRACTOR ===")
    
    # 1. Fetch tables
    batches = fetch_supabase_table("dye_batches")
    dyes = fetch_supabase_table("dye_batch_dyes")
    chemicals = fetch_supabase_table("dye_batch_chemicals")
    processes = fetch_supabase_table("dye_batch_process")
    shade_results = fetch_supabase_table("dye_batch_shade_results")
    target_shades = fetch_supabase_table("dye_batch_target_shade")

    # Index related records by batch_id
    dyes_by_batch = {}
    for d in dyes:
        bid = d.get('batch_id')
        dyes_by_batch.setdefault(bid, []).append(d)

    chems_by_batch = {}
    for c in chemicals:
        bid = c.get('batch_id')
        chems_by_batch.setdefault(bid, []).append(c)

    proc_by_batch = {}
    for p in processes:
        bid = p.get('batch_id')
        proc_by_batch[bid] = p

    results_by_batch = {}
    for r in shade_results:
        bid = r.get('batch_id')
        results_by_batch.setdefault(bid, []).append(r)

    target_by_batch = {}
    for t in target_shades:
        bid = t.get('batch_id')
        target_by_batch[bid] = t

    valid_samples = []
    rejected_samples = []

    for b in batches:
        batch_id = b.get('id') or b.get('batch_id')
        status = b.get('data_quality_status') or b.get('status') or 'draft'
        data_source = b.get('data_source') or 'real_batch'

        # Rule 1: Exclude draft, incomplete, or rejected status
        if status in ['draft', 'incomplete', 'rejected']:
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": f"Quality status '{status}' not eligible for training dataset"
            })
            continue

        # Rule 2: Exclude non-supervised reference or synthetic sources
        if data_source in ['reference_recipe', 'synthetic']:
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": f"Data source '{data_source}' is not a real measured dyeing batch"
            })
            continue

        # Rule 3: Check for measured L*a*b* result
        b_results = [r for r in results_by_batch.get(batch_id, []) if r.get('data_source', 'real_batch') == 'real_batch']
        if not b_results:
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": "Missing measured spectrophotometer L*a*b* outcome"
            })
            continue

        res = b_results[0]
        mL = res.get('measured_L')
        ma = res.get('measured_a')
        mb = res.get('measured_b')

        if mL is None or ma is None or mb is None:
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": "Incomplete measured L*a*b* values (contains null)"
            })
            continue

        # Rule 4: Validate numeric boundaries for Lab
        if not (0 <= float(mL) <= 100 and -128 <= float(ma) <= 127 and -128 <= float(mb) <= 127):
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": f"Out-of-bounds L*a*b* values (L={mL}, a={ma}, b={mb})"
            })
            continue

        # Rule 5: Validate recipe inputs
        fiber_comp = b.get('fiber_composition')
        fabric_type = b.get('fabric_type')
        dye_class = b.get('dye_class')

        if not fiber_comp or not fabric_type or not dye_class:
            rejected_samples.append({
                "batch_id": batch_id,
                "reason": "Missing material/dye_class metadata"
            })
            continue

        # Build valid sample
        sample = {
            "batch_id": batch_id,
            "data_source": data_source,
            "material": {
                "fiber_composition": fiber_comp,
                "fabric_type": fabric_type,
                "gsm": b.get('gsm'),
                "fabric_weight_kg": b.get('fabric_weight_kg'),
            },
            "dye_recipe": {
                "dye_class": dye_class,
                "dyes": [
                    {
                        "dye_id": d.get('dye_id'),
                        "dye_name": d.get('dye_name'),
                        "concentration": d.get('actual_concentration') or d.get('planned_concentration'),
                        "unit": d.get('unit', '% OWF')
                    }
                    for d in dyes_by_batch.get(batch_id, [])
                ]
            },
            "chemical_recipe": {
                "chemicals": [
                    {
                        "chemical_id": c.get('chemical_id'),
                        "chemical_name": c.get('chemical_name'),
                        "dosage": c.get('actual_dosage') or c.get('planned_dosage'),
                        "unit": c.get('unit', 'g/L'),
                        "addition_stage": c.get('addition_stage')
                    }
                    for c in chems_by_batch.get(batch_id, [])
                ]
            },
            "process": {
                "liquor_ratio": (proc_by_batch.get(batch_id) or {}).get('liquor_ratio'),
                "temperature": (proc_by_batch.get(batch_id) or {}).get('temperature_actual') or (proc_by_batch.get(batch_id) or {}).get('temperature'),
                "time_minutes": (proc_by_batch.get(batch_id) or {}).get('time_minutes'),
                "ph": (proc_by_batch.get(batch_id) or {}).get('ph_actual') or (proc_by_batch.get(batch_id) or {}).get('ph'),
                "machine": (proc_by_batch.get(batch_id) or {}).get('machine_id') or b.get('machine')
            },
            "target_shade": target_by_batch.get(batch_id),
            "measured_lab": {
                "L": float(mL),
                "a": float(ma),
                "b": float(mb)
            },
            "delta_e_76": res.get('delta_e_76')
        }
        valid_samples.append(sample)

    dataset_manifest = {
        "dataset_version": "dye_shade_dataset_v001",
        "schema_version": "v1.0.0",
        "extraction_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_source_batches": len(batches),
        "valid_samples": len(valid_samples),
        "rejected_samples": len(rejected_samples),
        "rejection_reasons": rejected_samples,
        "training_ready": len(valid_samples) >= 200,
        "minimum_configured_samples": 200,
        "note": "Model training blocked until sufficient supervised batches with measured L*a*b* outcomes are collected. Do not train on reference/synthetic data.",
        "data": valid_samples
    }

    out_dir = Path(__file__).parent
    out_file = out_dir / 'dye_shade_dataset_v001.json'
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(dataset_manifest, f, indent=2)

    print(f"Extraction complete.")
    print(f"Total source batches: {len(batches)}")
    print(f"Valid supervised samples: {len(valid_samples)}")
    print(f"Rejected samples: {len(rejected_samples)}")
    print(f"Training ready: {dataset_manifest['training_ready']}")
    print(f"Manifest written to: {out_file}")
    
    return dataset_manifest

if __name__ == '__main__':
    extract_dataset()
