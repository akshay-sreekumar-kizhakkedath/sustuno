# Machine Constraints Specification: Continuous Pad-Steam Dyeing Range (PST-KUST-600)

## 1. Machine Details
- **Machine Name**: Continuous Pad-Steam Dyeing Range
- **Machine Type**: Continuous Open-Width Pad-Steam Dyeing Line
- **Manufacturer**: Küstners Textile Machinery / Benninger
- **Model**: PST-KUST-600
- **Year**: 2021

---

## 2. Capacity
- **Minimum Batch Size**: 1000 meters (Continuous run)
- **Maximum Batch Size**: 50,000+ meters continuous production run
- **Fabric Capacity**: Continuous production line (Speed 30 - 80 m/min)
- **Liquor Capacity**: Pad Trough 15 to 25 Liters (Low volume anti-tailing trough)

---

## 3. Operating Limits
- **Minimum Temperature**: 20 °C
- **Maximum Temperature**: 105 °C Saturated Steamer
- **Minimum Pressure**: 0.0 bar
- **Maximum Pressure**: 5.0 bar Pad Mangle Nip Pressure
- **Maximum Speed**: 80 m/min line speed
- **Heating Rate**: Instantaneous Steam Injection
- **Cooling Rate**: Continuous counter-flow wash boxes

---

## 4. Process Compatibility
- **Supported Fabric Types**: 100% Woven Cotton, P/C Blends, Linen, Denim, Workwear Bottom-weights
- **Supported Dye Types**: Vat Dyes, Reactive Dyes, Sulfur Dyes
- **Supported Chemicals**: Caustic Soda, Sodium Hydrosulfite, Salt, Soda Ash, H2O2, Migration Inhibitors
- **Suitable Processes**: Continuous Pigment Padding, Chemical Reduction Steaming, Continuous Oxidation & Washing

---

## 5. Machine Constraints
- **Maximum Load**: Continuous line operation
- **Minimum Load**: 1000 meters run to justify chemical pad trough setup
- **Temperature Restrictions**: Steamer temp strictly 102°C - 104°C saturated steam
- **Pressure Restrictions**: Pad mangle nip pressure 2.5 to 4.5 bar
- **Chemical Restrictions**: Oxygen concentration inside steamer MUST be < 0.1% for Vat dyes
- **Fabric Restrictions**: Open-width woven fabrics only
- **Liquor Ratio Limits**: Padding Pick-up Expression 60% to 75% wet pick-up

---

## 6. Performance
- **Water Consumption**: 15 to 25 Liters per kg of fabric (High efficiency counter-flow washers)
- **Steam Consumption**: 1.5 to 2.2 kg steam per kg fabric
- **Power Consumption**: 65 kW total multi-drive synchronized motor line
- **Cycle Time**: Continuous (Speed 40 m/min)
- **Efficiency**: 94% OEE on long production runs

---

## 7. Sensors (IoT Integration)
- **Temperature Sensor**: Multi-point Steamer PT100 Sensors & IR Fabric Temp Sensor
- **Pressure Sensor**: Pad Roller Nip Pneumatic Pressure Transmitters
- **Flow Sensor**: Chemical Dosing Flow Meters & Wash Box Water Meters
- **pH Sensor**: Continuous Wash Box pH Transmitter
- **Conductivity Sensor**: Wash Box Salt Conductivity Sensor
- **Level Sensor**: Pad Trough Ultrasonic Level Sensor

---

## 8. Operating Parameters
- **Recommended Temperature**: Steamer 102°C | IR Dryer 120°C | Washers 95°C
- **Recommended Pressure**: Pad Mangle 3.5 bar pneumatic nip
- **Recommended Speed**: 40 to 60 m/min line speed
- **Recommended Liquor Ratio**: 65% Wet Pick-Up Expression

---

## 9. Maintenance
- **Daily Checks**: Inspect pad mangle rubber roll surfaces, check steamer water lock seals
- **Weekly Checks**: Inspect swimming roller deflection pneumatic seals, test IR pre-dryer sensors
- **Monthly Checks**: Calibrate pad mangle nip pressure profile, calibrate steamer temp probes
- **Calibration Requirements**: Semi-annual line synchronization and nip pressure calibration

---

## 10. Failure Information
- **Common Faults**: Head-to-tail shade variation (tailing), center-to-selvedge shade variation, oxidation specks
- **Alarm Conditions**: Steamer temp < 101°C, Steamer O2 > 0.2%, Pad trough level low, Line speed mismatch
- **Failure Causes**: Trough liquor replacement time > 45s, pad roll deflection, steamer air ingress
- **Troubleshooting**: Adjust trough volume displacement insert; re-crown swimming roll; seal steamer entry

---

## 11. Safety
- **Safety Limits**: Max steamer temp 105°C, Max pad nip 5.0 bar, Emergency cord full line trip
- **Emergency Shutdown Conditions**: Emergency trip cord pulled along line, IR pre-dryer fire alarm, steamer lock failure
- **PPE Requirements**: Full face shield, chemical aprons, rubber boots, gas monitor for SO2

---

## 12. AI Constraints (AI Validation Engine Rules)
### Machine Operating Rules
- `ASSERT trough_liquor_replacement_time_seconds <= 30`
- `IF dye_type == 'Vat' THEN steamer_o2_percent MUST BE < 0.1%`
- `ASSERT wet_pick_up_percent >= 60 AND wet_pick_up_percent <= 75`

### Parameter Limits
- **max_line_speed_m_per_min**: `80`
- **min_steamer_temp_c**: `101.5`
- **max_steamer_temp_c**: `104.5`
- **max_trough_volume_liters**: `25`

### Recommended Operating Ranges
- **pad_nip_pressure_bar**: `[3.0, 4.0]`
- **steamer_dwell_time_seconds**: `[45, 75]`

### Constraint Equations
- `Replacement_Time_s = (Trough_Volume_L * 60) / (Line_Speed_m_min * Fabric_Weight_kg_m * (PickUp_Percent / 100))`
- `ASSERT Replacement_Time_s <= 30`
- `Wet_PickUp_Percent = ((Wet_Weight - Dry_Weight) / Dry_Weight) * 100`

### Interlock Conditions
- ⚠️ Chemical pad trough feed valve SHUTS OFF if Line_Speed < 5 m/min
- ⚠️ IR Pre-dryer power CUT OFF automatically if Fabric_Motion_Sensor == STOPPED (fire prevention)

### Decision Rules
- 🛑 REJECT run IF batch_length_meters < 1000
- 🛑 REJECT recipe IF replacement_time_seconds > 45

### Best Operating Practices
- 💡 Maintain IR pre-dryer power to ensure fabric moisture drops to 25% before cylinder dryer contact
- 💡 Use swimming roll pneumatic pressure control to maintain uniform nip pick-up across 1.8m width
