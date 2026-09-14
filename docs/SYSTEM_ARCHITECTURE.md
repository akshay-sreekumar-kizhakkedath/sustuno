# SUSTUNO (AquaTex AI) — System Architecture

> Status: IMPLEMENTED (non-IoT scope). IoT/sensor acquisition is OUT_OF_SCOPE FOR CURRENT PHASE. Final treated-water reuse/polishing feedback loop is FUTURE_SCOPE.


## Architecture Overview

```
                        SUSTUNO PLATFORM
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
        Knowledge Base      Supabase DB        React UI
        (619 Records)      (47 Live Tables)   (Vite + TS)
             │                 │                 │
             └────────┬────────┘                 │
                      ▼                          │
              DECISION ENGINE                    │
                      │                          │
       ┌──────────────┼──────────────┐           │
       │              │              │           │
       ▼              ▼              ▼           ▼
 Dye Optimization   Batch AI     ETP Support   REST APIs
 (Candidate Gen +   (Planned vs   (Advisory    (Express)
  Constraint Engine)  Actual)     DSS + Rules)
       │              │              │
       ▼              ▼              ▼
  Shade ML        Training      Wastewater
  Prediction      Readiness      Profile
 (Data Dependent)  (0 Batches)  (Data Dependent)
```

---

## Status Classification

| Component | Status | Note |
|---|---|---|
| **Frontend Platform** | `IMPLEMENTED` | React + Vite + TypeScript production build passing. |
| **Backend REST APIs** | `IMPLEMENTED` | Express.js API server connected to Supabase DB. |
| **Knowledge Base** | `IMPLEMENTED` | 619 structured records, 13 rules (human validation `pending`). |
| **Dye Recipe Optimizer** | `IMPLEMENTED` | Candidate generator, constraint evaluator, cost, Delta-E 76. |
| **Dye Batch Pipeline** | `IMPLEMENTED` | Planned vs actual recording, measured L*a*b*, Delta-E 76. |
| **Dye Shade ML Model** | `DATA-DEPENDENT` / `NOT_AVAILABLE` | Refuses training until >= 200 real measured batches exist. |
| **Wastewater Prediction** | `DATA-DEPENDENT` / `NOT_AVAILABLE` | Returns `prediction_status: not_available` honestly without fake data. |
| **ETP Decision Support** | `IMPLEMENTED` | Advisory decision support with full explainability. Does not control hardware. |
| **IoT / Physical Telemetry** | `OUT_OF_SCOPE` | Physical hardware, ESP32, Modbus, PLC telemetry out of scope. |
| **Final Water Reuse Loop** | `FUTURE_SCOPE` | Final treated water feedback loop designated as future scope. |

