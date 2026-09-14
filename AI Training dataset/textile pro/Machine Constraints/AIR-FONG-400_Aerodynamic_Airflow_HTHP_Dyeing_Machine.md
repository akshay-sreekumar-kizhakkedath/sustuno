# Machine Constraints Specification: Aerodynamic Airflow HTHP Dyeing Machine (AIR-FONG-400)

## 1. Machine Details
- **Machine Name**: Aerodynamic Airflow HTHP Dyeing Machine
- **Machine Type**: Air-Jet Aerodynamic Transport Dyeing Vessel
- **Manufacturer**: Fong's / THEN Maschinen GmbH
- **Model**: AIR-FONG-400
- **Year**: 2023

---

## 2. Capacity
- **Minimum Batch Size**: 200 kg (50% rated load)
- **Maximum Batch Size**: 400 kg (4 chamber tubes @ 100 kg each)
- **Fabric Capacity**: 400 kg dry fabric weight
- **Liquor Capacity**: 1200 to 1600 Liters (Ultra-low liquor volume)

---

## 3. Operating Limits
- **Minimum Temperature**: 20 °C
- **Maximum Temperature**: 140 °C
- **Minimum Pressure**: 0.0 bar
- **Maximum Pressure**: 4.0 bar
- **Maximum Speed**: 500 m/min fabric velocity via air stream
- **Heating Rate**: 1.0 °C/min to 4.0 °C/min
- **Cooling Rate**: 1.5 °C/min to 3.0 °C/min

---

## 4. Process Compatibility
- **Supported Fabric Types**: Sensitive knits, Lycra/Spandex blends, Tencel, Viscose, Microfiber PES
- **Supported Dye Types**: Reactive Dyes, Disperse Dyes, Acid Dyes
- **Supported Chemicals**: Dyes, Salt, Soda Ash, Acetic Acid, Anti-foaming agents
- **Suitable Processes**: Ultra-low liquor exhaust dyeing, Scouring, Washing-off

---

## 5. Machine Constraints
- **Maximum Load**: 400 kg (100 kg per chamber tube)
- **Minimum Load**: 200 kg
- **Temperature Restrictions**: Max 140°C
- **Pressure Restrictions**: Air injection blower operating pressure 0.6 bar
- **Chemical Restrictions**: Silicon-free anti-foaming agent mandatory to prevent air lock
- **Fabric Restrictions**: Fabric weight must be > 80 GSM to prevent rope collapse inside air stream
- **Liquor Ratio Limits**: 1:3 to 1:5 MLR (Ultra-low ratio)

---

## 6. Performance
- **Water Consumption**: 25 to 35 Liters per kg of fabric (40% water savings vs soft-flow)
- **Steam Consumption**: 1.8 to 2.4 kg steam per kg of fabric
- **Power Consumption**: 30 kW high-pressure air blower + 15 kW liquor pump
- **Cycle Time**: 150 to 210 minutes
- **Efficiency**: 92% OEE

---

## 7. Sensors (IoT Integration)
- **Temperature Sensor**: Dual PT100 Sensors
- **Pressure Sensor**: Vessel & Air Blower Pressure Sensors
- **Flow Sensor**: Air Velocity Meter (m/s) & Liquor Flow Meter
- **pH Sensor**: In-line Industrial pH Sensor
- **Conductivity Sensor**: Salt Concentration Conductivity Sensor
- **Level Sensor**: Low-volume Hydrostatic Level Sensor

---

## 8. Operating Parameters
- **Recommended Temperature**: 60°C (Reactive) / 130°C (Disperse)
- **Recommended Pressure**: 2.8 bar at 130°C
- **Recommended Speed**: Air Velocity 35 m/s | Fabric Speed 350 m/min
- **Recommended Liquor Ratio**: 1:3.5 MLR

---

## 9. Maintenance
- **Daily Checks**: Clean air blower lint filter screen, inspect atomization nozzles
- **Weekly Checks**: Check air blower belt and bearings, calibrate level sensor
- **Monthly Checks**: Inspect heat exchanger for lint build-up, calibrate temp sensors
- **Calibration Requirements**: Bi-annual air velocity sensor and temperature calibration

---

## 10. Failure Information
- **Common Faults**: Air-lock due to excessive foam, lint clogging in air recirculation tube
- **Alarm Conditions**: Air pressure drop < 0.3 bar, foam sensor trip, high turn time
- **Failure Causes**: Omission of defoamer, high linting fabric without pre-singeing
- **Troubleshooting**: Dose 1 g/L silicon-free defoamer; auto-flush air filter screen

---

## 11. Safety
- **Safety Limits**: Max temp 140°C, Max pressure 4.0 bar
- **Emergency Shutdown Conditions**: Air blower failure, vessel overpressure, main door seal pressure loss
- **PPE Requirements**: Ear defenders (high blower noise), safety glasses, heat gloves

---

## 12. AI Constraints (AI Validation Engine Rules)
### Machine Operating Rules
- `ASSERT liquor_ratio >= 3.0 AND liquor_ratio <= 5.0`
- `IF foam_level > HIGH THEN AUTO_DOSE defoamer_g_per_l = 0.8`
- `IF fabric_gsm < 80 THEN REJECT (rope collapse risk)`

### Parameter Limits
- **min_air_velocity_m_per_s**: `25`
- **max_air_velocity_m_per_s**: `45`
- **min_liquor_ratio**: `3.0`
- **max_liquor_ratio**: `5.0`

### Recommended Operating Ranges
- **air_blower_rpm**: `[1800, 2400]`
- **fabric_speed_m_per_min**: `[300, 450]`

### Constraint Equations
- `Air_Power_kW = Blower_Flow_m3_h * Pressure_bar / 3600 * 1.2`
- `ASSERT MLR >= 3.0 AND MLR <= 5.0`

### Interlock Conditions
- ⚠️ Liquor atomization spray CANNOT start unless Air_Blower_Status == RUNNING

### Decision Rules
- 🛑 REJECT recipe IF requested_mlr > 1:5.5
- 🛑 REQUIRE silicon_free_defoamer >= 0.5 g/L FOR ALL RECIPES

### Best Operating Practices
- 💡 Pre-dissolve defoamer in feed tank before introducing air stream
- 💡 Run continuous air filter flushing cycle during high-speed heating phases
