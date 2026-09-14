-- Smallest migration for dye batch data collection
-- Reuses optimization session concept; adds batch + shade result + dataset readiness

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
  status VARCHAR(20) DEFAULT 'draft', -- draft, incomplete, complete, validated, rejected
  data_quality_status VARCHAR(20) DEFAULT 'incomplete',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS dye_batch_process (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  machine_id VARCHAR(50),
  liquor_ratio DECIMAL(6,2),
  temperature_actual DECIMAL(5,1),
  time_minutes INTEGER,
  ph_actual DECIMAL(4,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dye_batch_target_shade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  target_L DECIMAL(6,2),
  target_a DECIMAL(6,2),
  target_b DECIMAL(6,2),
  shade_name VARCHAR(100),
  shade_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  measurement_notes TEXT,
  delta_e_76 DECIMAL(6,2),
  data_source VARCHAR(20) DEFAULT 'real_batch', -- real_batch, reference_recipe, synthetic, lab_experiment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dye_batch_optimization ON dye_batches(optimization_id);
CREATE INDEX IF NOT EXISTS idx_dye_batch_status ON dye_batches(status, data_quality_status);
CREATE INDEX IF NOT EXISTS idx_shade_batch ON dye_batch_shade_results(batch_id);

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
