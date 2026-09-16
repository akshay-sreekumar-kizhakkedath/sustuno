-- Migration 005: Unified Workflow Schema
-- Connects Production, Optimization, Confirmed Recipe, Wastewater Prediction,
-- IoT Monitoring, Expected vs Actual Comparison, and ETP Decision Support
-- under one Master Batch ID.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Extend dye_batches with lifecycle and recipe persistence columns
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS original_input JSONB;
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS confirmed_recipe JSONB;
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(100);
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(50) DEFAULT 'DRAFT';

-- Backfill batch_id if null using YYYY-NNNN pattern (e.g., BATCH-2026-0001)
-- Assigns sequential batch numbers within each year based on created_at order
DO $$
DECLARE
  batch_rec RECORD;
  year_str TEXT;
  count_int INTEGER;
  batch_id_str TEXT;
BEGIN
  FOR batch_rec IN SELECT id, created_at FROM dye_batches WHERE batch_id IS NULL LOOP
    year_str := TO_CHAR(batch_rec.created_at, 'YYYY');
    -- Count batches created on or before this batch's date within the same year
    SELECT COUNT(*) INTO count_int FROM dye_batches d2
    WHERE d2.created_at <= batch_rec.created_at
      AND d2.batch_id IS NULL;
    batch_id_str := 'BATCH-' || year_str || '-' || LPAD((count_int % 10000 + 1)::text, 4, '0');
    UPDATE dye_batches SET batch_id = batch_id_str WHERE id = batch_rec.id;
  END LOOP;
END $$;

-- 2. Wastewater Predictions table (persists expected profile per batch)
CREATE TABLE IF NOT EXISTS wastewater_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  prediction_status VARCHAR(50) NOT NULL DEFAULT 'not_available',
  predicted_profile JSONB,
  engineering_estimates JSONB,
  model_versions JSONB,
  warnings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_wastewater_predictions_batch UNIQUE (batch_id)
);

CREATE INDEX IF NOT EXISTS idx_wastewater_predictions_batch ON wastewater_predictions(batch_id);

-- 3. IoT Monitoring Sessions table (binds device to active batch)
CREATE TABLE IF NOT EXISTS iot_monitoring_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  device_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_iot_sessions_batch ON iot_monitoring_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_iot_sessions_device ON iot_monitoring_sessions(device_id, status);

-- 4. ETP Recommendations table (persists decision support per batch)
CREATE TABLE IF NOT EXISTS etp_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  recommendation_status VARCHAR(50) NOT NULL,
  recommendation TEXT,
  reason TEXT,
  evidence JSONB,
  dosing JSONB,
  strategies JSONB,
  rules JSONB,
  warnings JSONB,
  water_reuse_suitability JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_etp_recommendations_batch UNIQUE (batch_id)
);

CREATE INDEX IF NOT EXISTS idx_etp_recommendations_batch ON etp_recommendations(batch_id);

-- 5. Add index on sensor_telemetry for fast batch & device lookups
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_batch_time ON sensor_telemetry(batch_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_device_time ON sensor_telemetry(device_id, timestamp DESC);
