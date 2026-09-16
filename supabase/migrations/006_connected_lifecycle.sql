-- Migration 006: Connected Lifecycle Tables
-- Adds production_orders, wastewater_measurements, batch_deviations, and lifecycle columns

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Production Orders table (origin of the batch lifecycle)
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer VARCHAR(100),
  fabric_type VARCHAR(100),
  fiber_composition TEXT,
  batch_weight_kg DECIMAL(10,2),
  gsm INTEGER,
  target_shade JSONB,
  shade_depth VARCHAR(20),
  dye_class VARCHAR(50),
  machine VARCHAR(100),
  status VARCHAR(20) DEFAULT 'CREATED',
  lifecycle_status VARCHAR(50) DEFAULT 'PRODUCTION_ORDER_CREATED',
  notes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_orders_order_number ON production_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_lifecycle ON production_orders(lifecycle_status);

-- 2. Wastewater Measurements table (actual measurements attached to batch)
CREATE TABLE IF NOT EXISTS wastewater_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  parameter VARCHAR(50) NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_source VARCHAR(30) NOT NULL DEFAULT 'manual_lab',
  quality VARCHAR(20) DEFAULT 'validated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wastewater_measurements_batch ON wastewater_measurements(batch_id);
CREATE INDEX IF NOT EXISTS idx_wastewater_measurements_param ON wastewater_measurements(batch_id, parameter);

-- 3. Batch Deviations/Anomalies table
CREATE TABLE IF NOT EXISTS batch_deviations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  parameter VARCHAR(100) NOT NULL,
  deviation_type VARCHAR(50) NOT NULL,
  expected_value DECIMAL(12,4),
  actual_value DECIMAL(12,4),
  deviation DECIMAL(12,4),
  deviation_pct DECIMAL(8,2),
  status VARCHAR(20) DEFAULT 'OPEN',
  contributing_factors JSONB,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_deviations_batch ON batch_deviations(batch_id);

-- 4. Add lifecycle_status column to dye_batches if not exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dye_batches' AND column_name = 'lifecycle_status'
  ) THEN
    ALTER TABLE dye_batches ADD COLUMN lifecycle_status VARCHAR(50) DEFAULT 'DRAFT';
  END IF;
END $$;

-- 5. Add batch_state_timeline table for state transition history
CREATE TABLE IF NOT EXISTS batch_state_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES dye_batches(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  trigger VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batch_timeline_batch ON batch_state_timeline(batch_id);

-- 6. Add training_eligibility column to dye_batches
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dye_batches' AND column_name = 'training_eligibility'
  ) THEN
    ALTER TABLE dye_batches ADD COLUMN training_eligibility VARCHAR(20) DEFAULT 'PENDING';
  END IF;
END $$;
