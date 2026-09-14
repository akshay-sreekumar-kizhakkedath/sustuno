
-- Supabase Migration: Dye Optimization Tables
-- Extends: uuid-ossp (already enabled in base schema)

--------------------------------------------------------------
-- 1. dye_opt_sessions
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dye_opt_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  session_name VARCHAR(200),
  objective VARCHAR(100), -- e.g., 'minimize_cost', 'maximize_shade_match'
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 2. dye_opt_inputs
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dye_opt_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES dye_opt_sessions(id) ON DELETE CASCADE,
  parameter_name VARCHAR(100) NOT NULL,
  parameter_value TEXT,
  parameter_type VARCHAR(50), -- e.g., 'numeric', 'categorical', 'range'
  unit VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 3. dye_opt_outputs
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dye_opt_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES dye_opt_sessions(id) ON DELETE CASCADE,
  recipe_component VARCHAR(100),
  recommended_amount DECIMAL(10,3),
  unit VARCHAR(20),
  confidence_score DECIMAL(5,2), -- 0 to 1
  rank INTEGER, -- rank of this recommendation in the output set
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 4. dye_opt_constraints
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dye_opt_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES dye_opt_sessions(id) ON DELETE CASCADE,
  constraint_type VARCHAR(100), -- e.g., 'max_cost', 'min_shade_match', 'availability'
  constraint_value TEXT,
  operator VARCHAR(10), -- e.g., '<=', '>=', '=='
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dye_opt_sessions_batch_id ON dye_opt_sessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_dye_opt_inputs_session_id ON dye_opt_inputs(session_id);
CREATE INDEX IF NOT EXISTS idx_dye_opt_outputs_session_id ON dye_opt_outputs(session_id);
CREATE INDEX IF NOT EXISTS idx_dye_opt_constraints_session_id ON dye_opt_constraints(session_id);

-- Enable Row Level Security (if needed for the app)
-- ALTER TABLE dye_opt_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dye_opt_inputs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dye_opt_outputs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dye_opt_constraints ENABLE ROW LEVEL SECURITY;

