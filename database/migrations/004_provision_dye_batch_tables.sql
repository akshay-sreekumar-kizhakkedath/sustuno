-- Migration 004: provision dye batch + shade result + model registry tables
-- Context: migration 003 was never applied to the live Supabase project, and its
-- column set does not match the backend code (which uses process_type, data_source,
-- machine, notes, shade_depth, measurement_temperature, etc.).
-- This migration is IDEMPOTENT: safe to apply whether or not 003 was applied.
-- It creates missing tables and adds any missing columns without touching data.
--
-- HOW TO APPLY: Supabase Dashboard -> SQL Editor -> paste this file -> Run.
-- (Requires no CLI; needs project owner access.)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- dye_batches (superset of 003 + columns used by routes/dyeBatchRoutes.js)
CREATE TABLE IF NOT EXISTS dye_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id VARCHAR(50) UNIQUE,
  optimization_id UUID REFERENCES dye_opt_sessions(id) ON DELETE SET NULL,
  recipe_id VARCHAR(50),
  batch_date DATE DEFAULT CURRENT_DATE,
  fiber_composition TEXT,
  fabric_type VARCHAR(100),
  gsm INTEGER,
  fabric_weight_kg DECIMAL(10,2),
  dye_class VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft',
  data_quality_status VARCHAR(20) DEFAULT 'incomplete',
  data_source VARCHAR(30) DEFAULT 'real_batch',
  machine VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS data_source VARCHAR(30) DEFAULT 'real_batch';
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS machine VARCHAR(100);
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS recipe_id VARCHAR(50);
ALTER TABLE dye_batches ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- dye_batch_dyes (matches backend inserts)
CREATE TABLE IF NOT EXISTS dye_batch_dyes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  dye_id VARCHAR(50),
  dye_name VARCHAR(200),
  planned_concentration DECIMAL(10,3),
  actual_concentration DECIMAL(10,3),
  planned_quantity_kg DECIMAL(10,3),
  actual_quantity_kg DECIMAL(10,3),
  unit VARCHAR(20) DEFAULT '% OWF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- dye_batch_chemicals (matches backend inserts)
CREATE TABLE IF NOT EXISTS dye_batch_chemicals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  chemical_id VARCHAR(50),
  chemical_name VARCHAR(200),
  planned_dosage DECIMAL(10,3),
  actual_dosage DECIMAL(10,3),
  unit VARCHAR(20) DEFAULT 'g/L',
  addition_stage VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- dye_batch_process (superset: code uses process_type/temperature/ph/machine;
-- 003 used temperature_actual/ph_actual/machine_id -- keep both, no data loss)
CREATE TABLE IF NOT EXISTS dye_batch_process (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  process_type VARCHAR(20) DEFAULT 'planned',
  machine VARCHAR(100),
  machine_id VARCHAR(50),
  liquor_ratio DECIMAL(6,2),
  temperature DECIMAL(6,2),
  temperature_actual DECIMAL(5,1),
  time_minutes INTEGER,
  ph DECIMAL(5,2),
  ph_actual DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS process_type VARCHAR(20) DEFAULT 'planned';
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS machine VARCHAR(100);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS machine_id VARCHAR(50);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS temperature DECIMAL(6,2);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS temperature_actual DECIMAL(5,1);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS ph DECIMAL(5,2);
ALTER TABLE dye_batch_process ADD COLUMN IF NOT EXISTS ph_actual DECIMAL(4,2);

-- dye_batch_target_shade (003 + shade_depth used by backend)
CREATE TABLE IF NOT EXISTS dye_batch_target_shade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  target_L DECIMAL(6,2),
  target_a DECIMAL(6,2),
  target_b DECIMAL(6,2),
  shade_name VARCHAR(100),
  shade_code VARCHAR(50),
  shade_depth VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dye_batch_target_shade ADD COLUMN IF NOT EXISTS shade_depth VARCHAR(20);

-- dye_batch_shade_results (003 + measurement_temperature used by backend)
CREATE TABLE IF NOT EXISTS dye_batch_shade_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  measured_L DECIMAL(6,2),
  measured_a DECIMAL(6,2),
  measured_b DECIMAL(6,2),
  measurement_date TIMESTAMPTZ DEFAULT NOW(),
  measurement_instrument VARCHAR(100),
  measurement_method VARCHAR(100),
  measurement_operator VARCHAR(100),
  sample_identifier VARCHAR(50),
  measurement_temperature DECIMAL(5,1),
  measurement_notes TEXT,
  delta_e_76 DECIMAL(6,2),
  data_source VARCHAR(20) DEFAULT 'real_batch',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dye_batch_shade_results ADD COLUMN IF NOT EXISTS measurement_temperature DECIMAL(5,1);

-- model registry (unchanged from 003)
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version VARCHAR(100) UNIQUE NOT NULL,
  model_type VARCHAR(100),
  dataset_version VARCHAR(100),
  feature_schema_version VARCHAR(50),
  metrics JSONB,
  artifact_path TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dye_batch_optimization ON dye_batches(optimization_id);
CREATE INDEX IF NOT EXISTS idx_dye_batch_status ON dye_batches(status, data_quality_status);
CREATE INDEX IF NOT EXISTS idx_shade_batch ON dye_batch_shade_results(batch_id);
