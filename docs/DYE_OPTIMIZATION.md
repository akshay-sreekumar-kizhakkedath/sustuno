# SUSTUNO — Dye Recipe Optimization Architecture

> Status: IMPLEMENTED / DATA-DEPENDENT FOR ML. Optimizer pipeline (validation, KB rules, candidates, constraints, scoring, ranking) works; ML shade prediction returns model_status=not_available until validated supervised data exists. ML never generates unrestricted recipes.


## Pipeline Overview

```
    User Input (Fabric, Weight, GSM, Target Lab, Dye Class)
                             │
                             ▼
                    Input Validation
                             │
                             ▼
                    Candidate Generation
                             │
                             ▼
            Constraint Evaluation (KB Rule Base)
                             │
                             ▼
       Shade Prediction (ML Bridge / Fallback Heuristic)
                             │
                             ▼
          Delta-E 76 & Cost Calculation & Ranking
                             │
                             ▼
                   Recommended Recipe Output
```

---

## Component Status

- **Candidate Generation**: `IMPLEMENTED`
- **Constraint Engine**: `IMPLEMENTED` (13 domain rules active in advisory mode with `human_validation_status = 'pending'`)
- **Shade ML Model**: `DATA-DEPENDENT` (`model_status = 'not_available'`)
- **Cost Calculation**: `IMPLEMENTED` (Uses reference prices or flags `cost_status = 'unavailable'`)
- **Ranking Engine**: `IMPLEMENTED`


> Process auto-suggest (2026-09-14): liquor ratio, temperature, time and pH are suggested from the selected fabric's standard recipe (GET /api/reference/process-defaults), capped to the selected machine's KB limits; every field stays editable with Auto/Manual badges. pH suggestion is a starting point � adjust per dye/chemical combo. The result card's wastewater handoff posts the recommended recipe + process to /api/wastewater/predict so the profile stays consistent with the optimization. Continuous lines (PST-KUST-600) accept null liquor/time. Status: IMPLEMENTED.

