# Machine Constraints Specification: HTHP Package Yarn Dyeing Machine (RBP-200)

## 1. Machine Details
- **Machine Name**: HTHP Package Yarn Dyeing Machine
- **Machine Type**: Pressurized Vertical Spindle Package Dyeing Vessel
- **Manufacturer**: Loris Bellini / Ugolini
- **Model**: RBP-200
- **Year**: 2021

---

## 2. Capacity
- **Minimum Batch Size**: 100 kg (50% spindle loading)
- **Maximum Batch Size**: 200 kg yarn weight
- **Fabric Capacity**: 200 kg yarn packages (approx 200 packages @ 1.0 kg each)
- **Liquor Capacity**: 1400 to 1800 Liters

---

## 3. Operating Limits
- **Minimum Temperature**: 20 °C
- **Maximum Temperature**: 135 °C
- **Minimum Pressure**: 0.0 bar
- **Maximum Pressure**: 4.5 bar
- **Maximum Speed**: Pump Flow Rate 40 L/kg/min
- **Heating Rate**: 1.0 °C/min to 3.0 °C/min
- **Cooling Rate**: 1.5 °C/min to 2.5 °C/min

---

## 4. Process Compatibility
- **Supported Fabric Types**: Cotton yarn packages, Polyester textured yarn, Wool cones, Acrylic yarn
- **Supported Dye Types**: Reactive Dyes, Disperse Dyes, Acid Dyes, Indanthrene Vat Dyes
- **Supported Chemicals**: Salt, Soda Ash, Caustic, Hydros, Acetic Acid, Dispersing agents
- **Suitable Processes**: Yarn Package Bleaching, Dyeing, Soaping, Rewinding preparation

---

## 5. Machine Constraints
- **Maximum Load**: 200 kg yarn weight
- **Minimum Load**: 100 kg (Requires dummy packages on empty spindles to prevent bypass)
- **Temperature Restrictions**: Max 135°C for polyester yarn
- **Pressure Restrictions**: Differential pressure Delta P must stay between 0.8 and 1.5 bar
- **Chemical Restrictions**: No free chlorine
- **Fabric Restrictions**: Requires rigid perforated plastic or stainless steel spring dye tubes
- **Liquor Ratio Limits**: 1:6 to 1:9 MLR

---

## 6. Performance
- **Water Consumption**: 40 to 55 Liters per kg of yarn
- **Steam Consumption**: 3.0 to 4.0 kg steam per kg of yarn
- **Power Consumption**: 22 kW main reversible centrifugal pump motor
- **Cycle Time**: 210 to 270 minutes
- **Efficiency**: 90% OEE

---

## 7. Sensors (IoT Integration)
- **Temperature Sensor**: PT100 Resistance Temperature Probe
- **Pressure Sensor**: Dual Differential Pressure Sensor (Spindle vs Vessel)
- **Flow Sensor**: Reversible Flow Meter (L/min)
- **pH Sensor**: In-line pH probe
- **Conductivity Sensor**: TDS / Salt Conductivity Probe
- **Level Sensor**: Hydrostatic Level Transmitter

---

## 8. Operating Parameters
- **Recommended Temperature**: 60°C (Reactive) / 130°C (Disperse)
- **Recommended Pressure**: Spindle Pressure 2.5 bar | Vessel Pressure 1.5 bar (Delta P 1.0 bar)
- **Recommended Speed**: Reversal Cycle: 4 min In-Out / 2 min Out-In
- **Recommended Liquor Ratio**: 1:7 MLR

---

## 9. Maintenance
- **Daily Checks**: Inspect spindle seals, check carrier locking nuts, clean main filter screen
- **Weekly Checks**: Inspect reversal valve pneumatic cylinders, test safety relief valve
- **Monthly Checks**: Calibrate differential pressure transmitter, inspect carrier spindles for bowing
- **Calibration Requirements**: Bi-annual calibration of flow meter and PT100 temperature sensors

---

## 10. Failure Information
- **Common Faults**: Liquor bypass channel formation, package tube collapsing, flow reversal valve jamming
- **Alarm Conditions**: Delta P < 0.5 bar (bypass), Delta P > 1.8 bar (clogging), Temp deviation
- **Failure Causes**: Uneven winding density (<0.30 g/cm³), excessive column compaction pressure
- **Troubleshooting**: Verify package winding density (0.35 ± 0.015 g/cm³); check spindle column torque

---

## 11. Safety
- **Safety Limits**: Max temp 135°C, Max vessel pressure 4.5 bar, Safety valve set at 4.2 bar
- **Emergency Shutdown Conditions**: Delta P spike > 2.2 bar, pneumatic door seal pressure drop, main pump overload
- **PPE Requirements**: Safety glasses, heat resistant gloves, safety shoes, hard hat near overhead crane

---

## 12. AI Constraints (AI Validation Engine Rules)
### Machine Operating Rules
- `ASSERT package_density >= 0.32 AND package_density <= 0.38 FOR Cotton yarn`
- `ASSERT package_density >= 0.38 AND package_density <= 0.42 FOR Polyester yarn`
- `IF empty_spindles > 0 THEN dummy_blanking_tubes MUST BE INSTALLED`

### Parameter Limits
- **min_delta_p_bar**: `0.8`
- **max_delta_p_bar**: `1.5`
- **min_flow_rate_l_per_kg_min**: `35`
- **max_flow_rate_l_per_kg_min**: `50`

### Recommended Operating Ranges
- **in_out_time_minutes**: `[4, 5]`
- **out_in_time_minutes**: `[2, 3]`

### Constraint Equations
- `Delta_P = Spindle_Pressure - Vessel_Pressure`
- `ASSERT Delta_P >= 0.8 AND Delta_P <= 1.5`
- `Package_Density = Yarn_Weight_g / (PI * (R_outer^2 - R_inner^2) * Height_cm)`

### Interlock Conditions
- ⚠️ Flow reversal valve CANNOT actuate unless Main_Pump_RPM < 20% (prevents water hammer)
- ⚠️ Door safety lock ENGAGED while Temperature > 80°C

### Decision Rules
- 🛑 REJECT package lot IF winding_density_variation > ±5%
- 🛑 REJECT recipe IF pump_flow_rate_per_kg < 30 L/kg/min

### Best Operating Practices
- 💡 Maintain 12-15% axial compaction when securing spindle locking nuts
- 💡 Use expandable stainless spring tubes for polyester package dyeing to allow shrinkage
