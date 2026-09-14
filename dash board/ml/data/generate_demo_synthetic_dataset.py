#!/usr/bin/env python3
"""
SUSTUNO DEMO synthetic dataset generator.

Produces a clearly-labeled SYNTHETIC dataset so the full shade-ML loop
(generate -> train -> evaluate -> infer -> optimizer ranking) can be
exercised end-to-end WITHOUT any real laboratory data.

THIS DATA IS NOT REAL. It uses a simple illustrative monotonic mapping
(dye concentration -> darker/less chromatic) plus noise. It is NOT chemistry,
NOT measured, and MUST NEVER be presented as production model training data.

Outputs:
  dash board/ml/data/demo_synthetic_dataset.json   (manifest, demo_* version)
  (never touches Supabase dye_batches or the production dataset manifest)
"""

import json
import datetime
import random
from pathlib import Path

N_SAMPLES = 320
SEED = 42

# Illustrative dye "hues" in Lab direction (NOT real colorimetry)
DEMO_DYES = {
    "Demo Red R-1": {"da": 9.0, "db": 4.0, "dl": -3.0},
    "Demo Blue B-1": {"da": -4.0, "db": -9.0, "dl": -3.5},
    "Demo Yellow Y-1": {"da": -3.0, "db": 10.0, "dl": -1.5},
    "Demo Black K-1": {"da": 0.5, "db": 0.5, "dl": -9.0},
}

FIBERS = ["cotton", "polyester", "cotton/polyester blend"]
FABRICS = ["woven", "knit"]
DYE_CLASSES = ["reactive", "disperse", "acid"]
MACHINES = ["JET-01", "JET-04", "PAD-02"]


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def main():
    rng = random.Random(SEED)
    samples = []

    for i in range(N_SAMPLES):
        fiber = rng.choice(FIBERS)
        fabric = rng.choice(FABRICS)
        dye_class = rng.choice(DYE_CLASSES)
        machine = rng.choice(MACHINES)
        gsm = rng.choice([140, 160, 180, 200, 220])
        weight_kg = rng.choice([50, 100, 150, 200])
        liquor_ratio = rng.choice([6, 8, 10, 12])
        temperature = rng.uniform(60, 130)
        time_minutes = rng.uniform(30, 120)
        ph = rng.uniform(4.5, 11.0)

        n_dyes = rng.choice([1, 2, 2, 3])
        dyes = []
        total_conc = 0.0
        da = db = dl = 0.0
        for _ in range(n_dyes):
            name = rng.choice(list(DEMO_DYES.keys()))
            conc = round(rng.uniform(0.1, 3.0), 3)
            total_conc += conc
            hue = DEMO_DYES[name]
            # Diminishing-returns response (sqrt), purely illustrative
            k = conc ** 0.5
            da += hue["da"] * k
            db += hue["db"] * k
            dl += hue["dl"] * k
            dyes.append({"name": name, "concentration": conc})

        # Process effects (illustrative): hotter/longer -> slightly deeper shade
        fix = (temperature - 60) / 70 * 0.6 + (time_minutes - 30) / 90 * 0.4
        L = 92.0 + dl * 2.2 - fix * 1.5 + rng.gauss(0, 0.35)
        a = da * 1.6 + rng.gauss(0, 0.3)
        b = db * 1.6 + rng.gauss(0, 0.3)

        samples.append({
            "batch_id": f"DEMO-SYN-{i+1:04d}",
            "data_source": "synthetic",
            "demo": True,
            "material": {
                "fiber_composition": fiber,
                "fabric_type": fabric,
                "gsm": gsm,
                "fabric_weight_kg": weight_kg,
            },
            "dye_recipe": {"dye_class": dye_class, "dyes": dyes},
            "chemical_recipe": {"chemicals": []},
            "process": {
                "liquor_ratio": round(liquor_ratio, 2),
                "temperature": round(temperature, 1),
                "time_minutes": round(time_minutes, 1),
                "ph": round(ph, 2),
                "machine": machine,
            },
            "measured_lab": {
                # "measured" here means synthetic generator output, NOT a spectrophotometer.
                "L": round(clamp(L, 5, 95), 2),
                "a": round(clamp(a, -60, 60), 2),
                "b": round(clamp(b, -60, 60), 2),
            },
        })

    ml_dir = Path(__file__).resolve().parents[1]
    out_path = ml_dir / "data" / "demo_synthetic_dataset.json"
    manifest = {
        "dataset_version": "demo_synthetic_dataset_v001",
        "data_source": "synthetic",
        "demo": True,
        "disclaimer": "SYNTHETIC DEMO DATA ONLY. Not measured, not chemistry, not for production use.",
        "extraction_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "valid_samples": len(samples),
        "data": samples,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Demo synthetic dataset written: {out_path} ({len(samples)} samples)")


if __name__ == "__main__":
    main()
