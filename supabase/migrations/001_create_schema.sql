-- Supabase Migration: Aquatex AI Dashboard Schema
-- Extends: uuid-ossp, realtime
-- Tables: 42 core tables + indexes + storage references

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

--------------------------------------------------------------
-- 1. batches
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id VARCHAR(20) UNIQUE NOT NULL,
  order_number VARCHAR(50),
  customer VARCHAR(100),
  shift VARCHAR(20),
  operator VARCHAR(100),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 2. fabric_details
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fabric_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  type VARCHAR(100),
  weight DECIMAL(10,2),
  gsm INTEGER,
  lot_number VARCHAR(50),
  qc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 3. dye_machine_settings
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dye_machine_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  dye_name VARCHAR(100),
  shade VARCHAR(50),
  machine VARCHAR(50),
  duration_minutes INTEGER,
  liquor_ratio VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 4. chemical_recipe_analysis
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chemical_recipe_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  agent VARCHAR(100),
  planned_amount DECIMAL(10,3),
  actual_amount DECIMAL(10,3),
  status VARCHAR(20) DEFAULT 'pending',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 5. resource_utilization
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_utilization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
  resource_type VARCHAR(50),
  value DECIMAL(10,2),
  unit VARCHAR(20),
  percentage DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 6. iot_sensors
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot_sensors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  tone VARCHAR(20),
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 7. sensor_telemetry
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sensor_telemetry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensor_id UUID REFERENCES iot_sensors(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value DECIMAL(10,3),
  quality VARCHAR(20) DEFAULT 'good',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_sensor_time ON sensor_telemetry(sensor_id, timestamp DESC);

--------------------------------------------------------------
-- 8. tank_levels
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tank_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_name VARCHAR(100) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  color VARCHAR(20),
  capacity_m3 DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 9. gateway_status
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gateway_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uptime_interval VARCHAR(50),
  model VARCHAR(50),
  wifi_signal VARCHAR(30),
  mqtt_status VARCHAR(30),
  firmware_version VARCHAR(20),
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 10. iot_alerts
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id VARCHAR(50) UNIQUE,
  tone VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 11. etp_kpis
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etp_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value DECIMAL(10,3),
  unit VARCHAR(20),
  icon VARCHAR(50),
  accent_color VARCHAR(20),
  subtitle TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 12. etp_decisions
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etp_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confidence INTEGER,
  verdict VARCHAR(50),
  verdict_subtitle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etp_decision_chips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES etp_decisions(id) ON DELETE CASCADE,
  label VARCHAR(20),
  value DECIMAL(10,2),
  unit VARCHAR(20),
  tone VARCHAR(20)
);

--------------------------------------------------------------
-- 13. treatment_strategy
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_strategy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_phase VARCHAR(100),
  ai_suggestion VARCHAR(100),
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 14. chemical_dosing
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chemical_dosing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chemical VARCHAR(50),
  dosage DECIMAL(10,3),
  percentage DECIMAL(5,2),
  color VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 15. ph_control
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_tank VARCHAR(100),
  current_ph DECIMAL(4,2),
  ai_target_ph DECIMAL(4,2),
  recommended_action TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 16. machine_directives
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS machine_directives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine VARCHAR(100),
  description TEXT,
  value VARCHAR(100),
  tone VARCHAR(20),
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 17. etp_financials
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etp_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  daily_cost DECIMAL(10,2),
  chemical_cost DECIMAL(10,2),
  energy_cost DECIMAL(10,2),
  savings DECIMAL(10,2),
  savings_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 18. water_quality_kpis
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_quality_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value DECIMAL(10,3),
  unit VARCHAR(20),
  icon VARCHAR(50),
  accent_color VARCHAR(20),
  badge_tone VARCHAR(20),
  badge_text VARCHAR(50),
  subtext TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 19. water_quality_trends
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_quality_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parameter VARCHAR(50) NOT NULL,
  value DECIMAL(10,3),
  series_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_water_quality_trends_param_time ON water_quality_trends(parameter, timestamp DESC);

--------------------------------------------------------------
-- 20. ai_insights
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value TEXT,
  badge TEXT,
  tone VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 21. predicted_quality
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predicted_quality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value DECIMAL(10,2),
  unit VARCHAR(20),
  percentage DECIMAL(5,2),
  color VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 22. etp_strategies
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etp_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icon VARCHAR(50),
  title VARCHAR(200) NOT NULL,
  status VARCHAR(50),
  tone VARCHAR(20),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 23. workflow_steps
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icon VARCHAR(50),
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  sort_order INTEGER DEFAULT 0
);

--------------------------------------------------------------
-- 24. system_alerts
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tone VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 25. compliance_score
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_score (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score DECIMAL(5,2),
  grade VARCHAR(20),
  caption TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 26. optimizer_form
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS optimizer_form (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fabric_types JSONB,
  machines JSONB,
  defaults JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 27. environmental_metrics
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environmental_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value DECIMAL(10,3),
  note TEXT,
  percentage DECIMAL(5,2),
  icon VARCHAR(50),
  color VARCHAR(20),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 28. water_usage_series
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS water_usage_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_label VARCHAR(20),
  cubic_meters DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 29. compliance_trends
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month VARCHAR(20) NOT NULL,
  percentage INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 30. savings_portfolio
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_cost_savings DECIMAL(15,2),
  pollution_tons_reduced DECIMAL(10,2),
  roi_percentage DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 31. model_accuracy
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_accuracy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  accuracy_percentage DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 32. analytics_filters
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filter_type VARCHAR(50) NOT NULL,
  options JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 33. prediction_kpis
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prediction_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value DECIMAL(10,2),
  unit VARCHAR(20),
  accent_color VARCHAR(20),
  progress_value INTEGER,
  progress_color VARCHAR(20),
  subtitle TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 34. optimized_recipes
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS optimized_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id VARCHAR(20),
  component VARCHAR(100),
  current_amount DECIMAL(10,3),
  recommended_amount DECIMAL(10,3),
  reduction_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 35. impact_metrics
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS impact_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(100) NOT NULL,
  value TEXT,
  subtext TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 36. control_center
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_center (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  water_saved VARCHAR(50),
  chemicals_used VARCHAR(50),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 37. predictor_form
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictor_form (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fabric_types JSONB,
  machines JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 38. report_types
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icon VARCHAR(50),
  label VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  accent VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 39. facility_segments
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facility_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  segment_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 40. export_formats
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS export_formats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  icon VARCHAR(50),
  label VARCHAR(100) NOT NULL,
  description TEXT,
  chip_color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 41. recent_reports
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recent_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  icon VARCHAR(50),
  icon_tone VARCHAR(20),
  date TIMESTAMPTZ NOT NULL,
  report_type VARCHAR(100),
  report_type_tone VARCHAR(20),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- 42. insights_summary
--------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insights_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value TEXT NOT NULL,
  label VARCHAR(200) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------------
-- Storage Buckets (reference for app config)
--------------------------------------------------------------
-- recipe-uploads  | reports  | ai-models  | documentation

--------------------------------------------------------------
-- Real-time Subscriptions (enable on these tables)
--------------------------------------------------------------
-- ALTER TABLE sensor_telemetry ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE water_quality_kpis ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE iot_alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE machine_directives ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE etp_decisions ENABLE ROW LEVEL SECURITY;
