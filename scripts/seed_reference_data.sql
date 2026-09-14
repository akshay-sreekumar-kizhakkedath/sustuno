-- Seed Reference Data from Static Files
-- Insert after schema is created

-- Batches
INSERT INTO batches (batch_id, order_number, customer, shift, operator, start_time, status) VALUES
('BT-842', 'ORD-2024-09', 'Vogue Textiles Ltd.', 'Morning (A)', 'M. Rahman', '2024-09-10 08:00:00+00', 'active');

-- Fabric (links to batch UUID — replace with actual UUID after batch insert)
-- Fabric types for optimizer_form
INSERT INTO optimizer_form (fabric_types, machines, defaults) VALUES
(
  '["Cotton 100% (Combed)", "Polyester Blend"]',
  '["Jet-04 (HTHP)", "Winch-02"]',
  '{"shade":"Midnight Navy B-12","weight":"1200","depth":"2.45","ratio":"1:6"}'
);

-- Predictor form
INSERT INTO predictor_form (fabric_types, machines) VALUES
(
  '["Organic Cotton Jersey","Recycled Polyester","Silk-Linen Blend"]',
  '["Fong’s Jigger-04","Thies iMaster-02"]'
);

-- Workflow steps
INSERT INTO workflow_steps (icon, label, color, sort_order) VALUES
('sensors', 'IoT Sensing', '#2563eb', 1),
('psychology', 'AI Analytics', '#712ae2', 2),
('tune', 'Calibration', '#2563eb', 3),
('check_circle', 'Execution', '#10b981', 4);

-- Report types
INSERT INTO report_types (icon, label, active, accent) VALUES
('today', 'Daily', true, NULL),
('calendar_view_week', 'Weekly', false, NULL),
('calendar_month', 'Monthly', false, NULL),
('event_note', 'Yearly', false, NULL),
('layers', 'Batch-wise', false, NULL),
('auto_awesome', 'AI Prediction', false, 'purple'),
('gavel', 'Compliance', false, NULL),
('eco', 'Carbon Reduction', false, 'green');

-- Facility segments
INSERT INTO facility_segments (segment_name) VALUES
('Main Effluent Plant A'), ('Secondary Treatment Unit'), ('RO Pre-filtration Stage');

-- Export formats
INSERT INTO export_formats (icon, label, description, chip_color) VALUES
('picture_as_pdf', 'PDF Document', 'High-fidelity print ready', 'red'),
('table_view', 'Excel Worksheet', 'Raw data and calculations', 'green'),
('csv', 'CSV Feed', 'Lightweight flat file', 'blue');

-- Analytics filters
INSERT INTO analytics_filters (filter_type, options) VALUES
('dateRanges', '["Last 30 Days","Last Quarter","Fiscal Year 2023","Custom Range"]'),
('machines', '["All Systems","Loom-402","Dye-Station-09","ETP-Main"]'),
('batches', '["Current Batches","Polyester-60","Cotton-White-12"]'),
('fabrics', '["All Materials","Synthetic Blend","Natural Organic"]');

-- Compliance score (initial)
INSERT INTO compliance_score (score, grade, caption) VALUES
(96.2, 'GRADE A', 'ZDHC MRSL Version 2.0 Compliant');

-- IoT sensors (initial registry)
INSERT INTO iot_sensors (sensor_id, label, icon, tone, location, is_active) VALUES
('S-001', 'pH Value', 'water_drop', 'green', 'Equalization Tank', true),
('S-002', 'EC (Cond.)', 'electric_bolt', 'green', 'Inlet Pipe', true),
('S-003', 'Turbidity', 'opacity', 'orange', 'Secondary Tank', true),
('S-004', 'Temperature', 'thermostat', 'green', 'Heat Exchanger', true),
('S-005', 'Flow Rate', 'speed', 'green', 'Main Line', true);
