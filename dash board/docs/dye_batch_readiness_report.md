# DYE BATCH DATA COLLECTION — READINESS REPORT
Created: 2026-09-13
Status: DATA COLLECTION INFRASTRUCTURE READY / NO REAL BATCH DATA

## 1. Migration added
- database/migrations/003_dye_batch_data_collection.sql
Creates dye_batches, dye_batch_dyes, dye_batch_chemicals, dye_batch_process, dye_batch_target_shade, dye_batch_shade_results.
No destructive changes.

## 2. Batch model
Batch represents actual dyeing experiment.
Distinction: target shade (planned) vs measured shade (actual).
Distinction: planned dye/chem/process vs actual.
Distinction: real_batch vs reference_recipe vs synthetic vs lab_experiment.
Data quality status: draft / incomplete / complete / validated / rejected.
Training-ready requires measured L*a*b* + recipe + process.

## 3. Required fields for training (documented)
- fiber, fabric, GSM, weight
- dye IDs + concentrations (planned/actual)
- chemical IDs + dosages (planned/actual)
- machine, liquor ratio, temperature, time, pH (actual preferred)
- target Lab
- measured Lab (required)
- data_source = real_batch

## 4. Dataset builder
- backend/services/dyeOptimization/datasetBuilder.js
Produces dataset version, valid/rejected counts, missing fields, training_ready boolean.
BLOCKED: 0 valid batches currently.
Status returned clearly; does not fabricate samples.

## 5. Template / docs
- docs/dye_batch_data_collection_template.md
Shows required/recommended/optional fields.

## 6. Actual current batch count
Real supervised dyeing batches with measured L*a*b* in DB: 0.
Reference recipes: ~5 (not supervised).
Synthetic/reference/synthetic-only data: 0 training-eligible samples.

## 7. Next data collection target
Minimum: 200 real dyeing batches with measured Lab before considering model training.
Start collecting from dyeing lab after implementing batch recording workflow.
