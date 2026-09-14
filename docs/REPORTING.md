# SUSTUNO — Auditable Report Generation

> Status: IMPLEMENTED. POST /api/reports/generate and GET /api/reports/list verified live; reports embed timestamps, model versions, warnings and KB pending-validation notices.


## Supported Report Types
1. Dye Optimization Report
2. Dyeing Batch Report
3. Shade Comparison Report
4. Recipe Comparison Report
5. Wastewater Prediction Report
6. ETP Decision Report
7. ML Dataset Readiness Report

Each report includes metadata (timestamp, model version, dataset version, KB rule status) and content sections.

