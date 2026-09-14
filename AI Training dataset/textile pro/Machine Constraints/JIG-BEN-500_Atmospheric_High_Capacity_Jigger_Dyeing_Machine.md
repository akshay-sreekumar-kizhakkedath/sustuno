# Machine Constraints Specification: Atmospheric High Capacity Jigger Dyeing Machine (JIG-BEN-500)

## 1. Machine Details
- **Machine Name**: Atmospheric High Capacity Jigger Dyeing Machine
- **Machine Type**: Constant Tension Constant Speed Open-Width Jigger
- **Manufacturer**: Benninger AG / Mezzera
- **Model**: JIG-BEN-500
- **Year**: 2020

---

## 2. Capacity
- **Minimum Batch Size**: 200 kg (approx 800 meters)
- **Maximum Batch Size**: 500 kg woven fabric (approx 2000 meters @ 250 GSM)
- **Fabric Capacity**: 500 kg woven fabric
- **Liquor Capacity**: 1500 to 2000 Liters pad trough & bath

---

## 3. Operating Limits
- **Minimum Temperature**: 20 °C
- **Maximum Temperature**: 98 °C (Atmospheric hood enclosed)
- **Minimum Pressure**: 0.0 bar
- **Maximum Pressure**: 0.0 bar (Atmospheric)
- **Maximum Speed**: 150 m/min fabric winding speed
- **Heating Rate**: 1.0 °C/min to 2.5 °C/min
- **Cooling Rate**: 1.5 °C/min

---

## 4. Process Compatibility
- **Supported Fabric Types**: 100% Woven Cotton, Linen, Viscose, Silk, Heavy Canvas & Denim
- **Supported Dye Types**: Reactive Dyes, Direct Dyes, Vat Dyes, Sulfur Dyes
- **Supported Chemicals**: Salt, Soda Ash, Caustic, Hydros, Sodium Sulfide
- **Suitable Processes**: Open-width Scouring, Bleaching, Dyeing, Soaping

---

## 5. Machine Constraints
- **Maximum Load**: 500 kg (Maximum roll diameter 1100 mm)
- **Minimum Load**: 150 kg
- **Temperature Restrictions**: Max 98°C at sea level (Cannot dye 100% Polyester without carriers)
- **Pressure Restrictions**: Atmospheric operation only
- **Chemical Restrictions**: Corrosive acids must be diluted prior to trough addition
- **Fabric Restrictions**: Woven fabrics only (Strictly NO knit fabrics due to selvedge curling)
- **Liquor Ratio Limits**: 1:3 to 1:5 MLR (Ultra-short liquor bath)

---

## 6. Performance
- **Water Consumption**: 30 to 45 Liters per kg of fabric
- **Steam Consumption**: 2.2 to 3.0 kg steam per kg
- **Power Consumption**: 15 kW DC drive motors with regenerative braking
- **Cycle Time**: 240 to 360 minutes
- **Efficiency**: 85% OEE

---

## 7. Sensors (IoT Integration)
- **Temperature Sensor**: PT100 Trough Temperature Sensor
- **Pressure Sensor**: Pneumatic Roll Tension Sensor (N)
- **Flow Sensor**: Trough Water Feed Flow Meter
- **pH Sensor**: Bath pH Probe
- **Conductivity Sensor**: Conductivity Sensor
- **Level Sensor**: Trough Level Sensor

---

## 8. Operating Parameters
- **Recommended Temperature**: 60°C (Reactive) / 95°C (Vat / Direct)
- **Recommended Pressure**: 0.0 bar
- **Recommended Speed**: 60 to 100 m/min (Warp tension 150 to 350 N)
- **Recommended Liquor Ratio**: 1:4 MLR

---

## 9. Maintenance
- **Daily Checks**: Inspect main drive roller rubbers, check expander bar alignment
- **Weekly Checks**: Inspect tension load cells, check hood door steam seals
- **Monthly Checks**: Calibrate warp tension load cells and temperature sensor
- **Calibration Requirements**: Quarterly tension load cell calibration

---

## 10. Failure Information
- **Common Faults**: Selvedge curling, end-to-end shade variation, warp streakiness
- **Alarm Conditions**: Tension limit exceeded (>500N), passage count error, hood open during 95°C
- **Failure Causes**: Uneven winding tension between main rollers, speed variation
- **Troubleshooting**: Zero load cell sensors; adjust bowing expander roller

---

## 11. Safety
- **Safety Limits**: Max temp 98°C, Max roll diameter 1100 mm
- **Emergency Shutdown Conditions**: Emergency stop bar triggered by operator, roll overrun
- **PPE Requirements**: Safety glasses, heat gloves, chemical boots

---

## 12. AI Constraints (AI Validation Engine Rules)
### Machine Operating Rules
- `IF fabric_structure == 'Knit' THEN REJECT (selvedge curling hazard)`
- `ASSERT warp_tension_N >= 100 AND warp_tension_N <= 400`
- `IF process == 'Vat_Dyeing' THEN closed_hood_steam_injection MUST BE ACTIVE`

### Parameter Limits
- **max_warp_tension_N**: `450`
- **min_warp_tension_N**: `80`
- **max_fabric_speed_m_per_min**: `120`
- **max_roll_diameter_mm**: `1100`

### Recommended Operating Ranges
- **fabric_speed_m_per_min**: `[60, 90]`
- **trough_liquor_ratio**: `[3.0, 4.5]`

### Constraint Equations
- `Passage_Time_Minutes = Total_Fabric_Length_m / Running_Speed_m_per_min`
- `ASSERT Warp_Tension_N <= 450`

### Interlock Conditions
- ⚠️ Main rollers CANNOT reverse direction unless Speed < 5 m/min
- ⚠️ Steam valve closes if Enclosure_Hood is OPEN

### Decision Rules
- 🛑 REJECT recipe IF target_temperature > 98°C
- 🛑 REJECT recipe IF fabric_type contains 'Knit'

### Best Operating Practices
- 💡 Keep enclosure hood tightly closed during 95°C holds to prevent edge cooling and listing defects
- 💡 Ensure equal number of passages (ends) are run for dye addition and washing phases
