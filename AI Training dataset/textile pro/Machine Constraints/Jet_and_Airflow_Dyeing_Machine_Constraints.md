# Jet & Airflow Dyeing Machine Hydraulic & Mechanical Constraints Guide

## 1. Overview of Hydraulic & Aerodynamic Transport Constraints
In rope dyeing machinery (Jet, Soft-Flow, and Air-Jet), fabric movement is driven by liquor pressure (hydraulic) or compressed air streams (aerodynamic) combined with a motorized winch reel. The primary engineering goal is to maintain uniform dye migration while preventing fabric surface abrasion, pilling, rope creasing, and mechanical tangling.

---

## 2. Key Mathematical Formulas & Operational Calculations

### 2.1 Fabric Rope Length ($L$)
The total rope length loaded in a single tube determines the turn time (cycle frequency):
$$L = \frac{W_{\text{fabric}} \times 1000}{\text{GSM} \times W_{\text{width}}}$$

*Where:*
- $L$ = Total fabric rope length per tube (meters)
- $W_{\text{fabric}}$ = Fabric load weight in tube (kg)
- $\text{GSM}$ = Grams per square meter ($\text{g/m}^2$)
- $W_{\text{width}}$ = Fabric open width (meters)

### 2.2 Turn Time (Cycle Time, $t_{\text{turn}}$)
Turn time is the time taken for one full loop of fabric to travel through the machine:
$$t_{\text{turn}} = \frac{L}{v_{\text{fabric}}}$$

*Where:*
- $t_{\text{turn}}$ = Turn time in minutes
- $v_{\text{fabric}}$ = Fabric linear speed (m/min)

> **Critical Constraint**: Target $t_{\text{turn}}$ must be kept between **0.8 to 1.5 minutes (48 – 90 seconds)**. If $t_{\text{turn}} > 2.0$ minutes, local dye depletion occurs at the nozzle, leading to heavy shade unlevelness and permanent rope creases.

---

## 3. Nozzle & Hydraulic Constraints

### 3.1 Jet Nozzle Pressure vs. Fabric Weight (GSM)
- **Delicate Knits & Lycra Blends (100 – 180 GSM)**:
  - Nozzle Diameter: **90 – 110 mm** (Overflow / Soft-Flow)
  - Nozzle Pressure: **0.2 – 0.5 bar**
  - Reel Speed: **200 – 300 m/min**
  - *Risk*: High nozzle pressure causes fiber pilling, filament breakage, and stretch distortion.

- **Medium Fabric / Heavy Knits (180 – 300 GSM)**:
  - Nozzle Diameter: **70 – 90 mm**
  - Nozzle Pressure: **0.6 – 0.9 bar**
  - Reel Speed: **300 – 400 m/min**

- **Heavy Woven Fabrics (300 – 500+ GSM)**:
  - Nozzle Diameter: **50 – 70 mm** (High-Impulsion Venturi Nozzle)
  - Nozzle Pressure: **1.0 – 1.4 bar**
  - Reel Speed: **250 – 350 m/min**

### 3.2 Winch Reel Synchronization & Slip Coefficient
- **Reel Speed vs. Nozzle Speed**: The winch reel speed ($v_{\text{reel}}$) must be synchronized within $\pm 5\%$ of the liquor nozzle velocity ($v_{\text{nozzle}}$).
- **Slip Coefficient**: If $v_{\text{reel}} > v_{\text{nozzle}}$, the fabric rope slips over the winch reel, creating friction heat, surface shine, and chafing marks.

---

## 4. Airflow (Aerodynamic) Machine Constraints

### 4.1 Air Transport Dynamics
- Airflow dyeing machines use an air blower system to transport the fabric rope, while dye liquor is atomized directly into the airflow airstream.
- **Liquor-to-Material Ratio (MLR)**: Ultra-low **1:3 to 1:4**.
- **Air Blower Rating**: Requires high power consumption (**15 – 30 kW** per tube).
- **Air Velocity**: **25 – 45 m/s** inside the transport tube.

### 4.2 Airflow Operational Constraints
1. **Foaming Tendency**: Ultra-low liquor and high-velocity air create massive foaming. Silicon-free anti-foaming agents (0.5 – 1.0 g/L) are strictly mandatory.
2. **Lint & Fly Accumulation**: High air recirculation traps textile lint in the internal heat exchanger; requires automated lint filter flushing every cycle.
3. **Weight Limitations**: Light weight fabrics (< 80 GSM) can balloon and collapse inside the air chamber, causing entanglements.

---

## 5. Machine Safeguards & Alarm Limits

| Alarm / Sensor | Trigger Condition | Automated Action | Machine Constraint Remediation |
| :--- | :--- | :--- | :--- |
| **Seam Detector (Magnet)** | Turn time $> 120$ seconds | Triggers reel speed boost or signals rope stoppage | Adjust nozzle pressure or reduce loading weight |
| **Knot / Tangle Sensor** | Mechanical displacement switch at nozzle input | Immediate main pump & reel stop | Prevents fabric tearing and machine tube jamming |
| **Pressure Differential Sensor** | Filter clogging ($\Delta P > 0.6$ bar) | Auditory alarm & pump throttle | Clean main liquor filter mesh |
| **High Temperature Door Interlock** | Temp $> 80^\circ\text{C}$ or Pressure $> 0.2$ bar | Pneumatic door lock engaged | Safety lock prevents accidental operator exposure |
