-- Migration 002: Align IoT telemetry tables with ESP32 ingestion schema
-- The ESP32 backend writes device-scoped sensor readings. The original
-- sensor_telemetry table (UUID sensor_id FK) cannot store those, so we:
--  1. widen sensor_telemetry.sensor_id to VARCHAR and drop the UUID FK
--  2. add device/plant/batch/status/voltage columns
--  3. add gateway_status columns written by the backend heartbeat
-- Idempotent. Safe to re-run.

BEGIN;

-- ---- sensor_telemetry ----------------------------------------------------
ALTER TABLE sensor_telemetry
  DROP CONSTRAINT IF EXISTS sensor_telemetry_sensor_id_fkey;

ALTER TABLE sensor_telemetry
  ALTER COLUMN sensor_id TYPE VARCHAR(50)
    USING sensor_id::text;

ALTER TABLE sensor_telemetry
  ADD COLUMN IF NOT EXISTS device_id     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS plant_id      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS batch_id      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS raw_voltage   DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS probe_voltage DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS total_liters  DECIMAL(12,3);

DROP INDEX IF EXISTS idx_sensor_telemetry_sensor_time;
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_sensor_time
  ON sensor_telemetry(sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_device_time
  ON sensor_telemetry(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_telemetry_batch_time
  ON sensor_telemetry(batch_id, timestamp DESC);

-- ---- gateway_status ------------------------------------------------------
ALTER TABLE gateway_status
  ADD COLUMN IF NOT EXISTS device_id   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS firmware    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS uptime      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS free_heap   BIGINT,
  ADD COLUMN IF NOT EXISTS health      VARCHAR(20);

-- ---- iot_sensors: seed the canonical string IDs the firmware reports -----
INSERT INTO iot_sensors (sensor_id, label, icon, tone, location, is_active)
SELECT v.sensor_id, v.label, v.icon, 'green', v.location, TRUE
FROM (VALUES
  ('ph',          'pH Value',          'ph',             'Inlet Tank'),
  ('tds',         'TDS (ppm)',         'water_drop',     'Inlet Tank'),
  ('turbidity',   'Turbidity (NTU)',   'opacity',        'Inlet Tank'),
  ('temperature', 'Temperature (°C)',  'thermostat',     'Inlet Tank'),
  ('flow_rate',   'Flow Rate (L/min)', 'speed',          'Inlet Line')
) AS v(sensor_id, label, icon, location)
WHERE NOT EXISTS (SELECT 1 FROM iot_sensors IS_SENSOR WHERE IS_SENSOR.sensor_id = v.sensor_id);

COMMIT;