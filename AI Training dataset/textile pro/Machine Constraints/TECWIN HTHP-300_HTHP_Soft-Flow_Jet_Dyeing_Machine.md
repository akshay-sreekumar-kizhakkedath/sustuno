# Machine Constraints Specification: HTHP Soft-Flow Jet Dyeing Machine (TECWIN HTHP-300)

## 1. Machine Details
- **Machine Name**: HTHP Soft-Flow Jet Dyeing Machine
- **Machine Type**: High Temperature High Pressure Rope Dyeing Machine
- **Manufacturer**: Fong's National Engineering / Thies GmbH
- **Model**: TECWIN HTHP-300
- **Year**: 2022

---

## 2. Capacity
- **Minimum Batch Size**: 150 kg (50% rated load)
- **Maximum Batch Size**: 300 kg (100% rated load)
- **Fabric Capacity**: 300 kg dry fabric weight
- **Liquor Capacity**: 1800 to 2400 Liters total vessel volume

---

## 3. Operating Limits
- **Minimum Temperature**: 20 °C
- **Maximum Temperature**: 140 °C
- **Minimum Pressure**: 0.0 bar (atmospheric)
- **Maximum Pressure**: 4.0 bar (design rating)
- **Maximum Speed**: 450 m/min winch reel fabric velocity
- **Heating Rate**: 0.5 °C/min to 3.5 °C/min
- **Cooling Rate**: 1.0 °C/min to 2.5 °C/min

---

## 4. Process Compatibility
- **Supported Fabric Types**: Cotton knits, Polyester knits & wovens, Polyamide, Viscose, T/C Blends
- **Supported Dye Types**: Reactive Dyes, Disperse Dyes, Acid Dyes, Direct Dyes
- **Supported Chemicals**: Salt, Soda Ash, Caustic Soda, Hydros, Acetic Acid, Leveling Agents
- **Suitable Processes**: Scouring, Bleaching, Exhaust Dyeing, Soaping, Reduction Clearing, Softening

---

## 5. Machine Constraints
- **Maximum Load**: 300 kg (Overloading >320 kg causes turn time >120s and severe rope marks)
- **Minimum Load**: 150 kg (Underloading <120 kg alters liquor ratio and causes liquor foaming)
- **Temperature Restrictions**: Do not exceed 135°C for elastomeric Lycra blends to avoid heat damage
- **Pressure Restrictions**: Main safety valve trips at 4.2 bar
- **Chemical Restrictions**: Strictly prohibit Sodium Hypochlorite or free Chlorine (corrodes 316L stainless steel)
- **Fabric Restrictions**: Not suitable for delicate silk satins or ultra-high tension sensitive wovens
- **Liquor Ratio Limits**: Minimum 1:5 | Maximum 1:10 (Optimal 1:6 to 1:8)

---

## 6. Performance
- **Water Consumption**: 35 to 50 Liters per kg of fabric processed (total process water)
- **Steam Consumption**: 2.8 to 3.5 kg steam per kg of fabric
- **Power Consumption**: 18.5 kW main pump motor + 5.5 kW winch reel motor
- **Cycle Time**: 180 to 240 minutes per batch
- **Efficiency**: 88% overall equipment effectiveness (OEE)

---

## 7. Sensors (IoT Integration)
- **Temperature Sensor**: Dual PT100 Resistance Temperature Detectors (Accuracy ±0.1°C)
- **Pressure Sensor**: Piezo-resistive Vessel Pressure Transmitter (0 to 6 bar)
- **Flow Sensor**: Electromagnetic Main Liquor Flow Meter (Liters/min)
- **pH Sensor**: In-line Industrial Gel-filled Glass Electrode pH Sensor (pH 0-14)
- **Conductivity Sensor**: Inductive Bath Salt/Conductivity Transmitter (0-200 mS/cm)
- **Level Sensor**: Differential Pressure Hydrostatic Level Transmitter (0-100% tank volume)

---

## 8. Operating Parameters
- **Recommended Temperature**: 60°C for Reactive Dyeing | 130°C for Disperse Dyeing
- **Recommended Pressure**: 2.8 bar at 130°C operating temperature
- **Recommended Speed**: 250 to 350 m/min winch reel speed (Turn time 50 to 75 seconds)
- **Recommended Liquor Ratio**: 1:6 MLR

---

## 9. Maintenance
- **Daily Checks**: Inspect main pump shaft seal, clean lint filter basket, check pneumatic door seal
- **Weekly Checks**: Inspect heat exchanger steam traps, calibrate pH electrode, check reel belt tension
- **Monthly Checks**: Calibrate PT100 temp sensors, inspect safety burst disc, check main valve actuators
- **Calibration Requirements**: Quarterly calibration of PT100 sensors and pressure transmitters with certified calibrator

---

## 10. Failure Information
- **Common Faults**: Rope entanglement/tangle, high differential pressure across filter, steam trap waterlog
- **Alarm Conditions**: Turn time > 120s, Temp deviation > ±2°C, Vessel pressure > 3.8 bar, Door safety open
- **Failure Causes**: Fabric knot formation, clogged filter screen, steam supply pressure drop < 5 bar
- **Troubleshooting**: Reverse winch reel manually; flush filter basket; verify boiler steam pressure

---

## 11. Safety
- **Safety Limits**: Max temp 140°C, Max pressure 4.0 bar, Door opening temp limit < 80°C
- **Emergency Shutdown Conditions**: Vessel overpressure > 4.1 bar, main circulation pump dry-run, power outage
- **PPE Requirements**: Heat-resistant gloves, safety goggles, steel-toe boots, ear protection

---

## 12. AI Constraints (AI Validation Engine Rules)
### Machine Operating Rules
- `IF fabric_type == 'Polyester' THEN max_temperature = 130°C AND min_pressure = 2.8 bar`
- `IF fabric_type == 'Cotton' THEN max_temperature = 98°C AND pressure = 0.0 bar`
- `IF fabric_gsm < 150 THEN max_nozzle_pressure = 0.5 bar (prevent pilling)`

### Parameter Limits
- **max_turn_time_seconds**: `90`
- **min_turn_time_seconds**: `45`
- **max_heating_rate_c_per_min**: `3.0`
- **min_liquor_ratio**: `5.0`
- **max_liquor_ratio**: `10.0`

### Recommended Operating Ranges
- **reactive_dyeing_temp_c**: `[58, 62]`
- **disperse_dyeing_temp_c**: `[128, 132]`
- **winch_speed_m_per_min**: `[250, 350]`

### Constraint Equations
- `Turn_Time_Seconds = (Fabric_Weight_kg * 1000 / (GSM * Width_m)) / Fabric_Speed_m_per_min * 60`
- `ASSERT Turn_Time_Seconds <= 90`
- `Liquor_Volume_L = Fabric_Weight_kg * MLR`
- `ASSERT Liquor_Volume_L >= 1500 AND Liquor_Volume_L <= 2400`

### Interlock Conditions
- ⚠️ Pneumatic door lock MUST remain ENGAGED while Vessel_Temperature > 80°C OR Vessel_Pressure > 0.2 bar
- ⚠️ Heating valve MUST CLOSE if Main_Pump_Flow < 200 L/min (dry run prevention)

### Decision Rules
- 🛑 REJECT recipe IF requested_load_kg > 300 kg
- 🛑 REJECT recipe IF liquor_ratio < 1:5 OR liquor_ratio > 1:10
- 🛑 FLAG WARNING IF heating_rate > 1.5°C/min between 90°C and 130°C on Polyester

### Best Operating Practices
- 💡 Perform hot drain at 80°C after disperse dyeing to keep oligomers in emulsion state
- 💡 Dose alkali exponentially over 30 min for reactive dyes to prevent strike unlevelness
