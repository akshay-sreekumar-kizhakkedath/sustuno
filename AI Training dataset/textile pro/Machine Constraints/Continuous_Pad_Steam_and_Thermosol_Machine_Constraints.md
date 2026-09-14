# Continuous Pad-Steam & Thermosol Dyeing Machinery Constraints Manual

## 1. Overview of Continuous Wet Processing Constraints
In continuous textile dyeing (Pad-Steam, Cold Pad-Batch [CPB], and Thermosol), open-width fabric moves continuously at high speeds through padding mangles, pre-dryers, fixation chambers, and wash boxes. Machine constraints center on liquid pick-up uniformity, pad trough liquor renewal rate (to prevent tailing), thermal heat transfer efficiency, and steam chamber oxygen exclusion.

---

## 2. Padding Mangle Hydraulics & Pick-up Dynamics

### 2.1 Wet Pick-up Percentage ($E\%$)
Wet pick-up is the percentage of dye liquor retained by the dry fabric after passing through the pad mangle nip rollers:
$$E\% = \left( \frac{W_{\text{wet}} - W_{\text{dry}}}{W_{\text{dry}}} \right) \times 100$$

*Where:*
- $E\%$ = Expression / Wet Pick-up Percentage (%)
- $W_{\text{wet}}$ = Fabric weight immediately after padding mangle (grams)
- $W_{\text{dry}}$ = Bone-dry fabric weight before padding (grams)

### 2.2 Standard Target Wet Pick-up Rates
| Substrate | Target Wet Pick-up ($E\%$) | Nip Pressure Range | Roller Shore Hardness |
| :--- | :--- | :--- | :--- |
| **100% Cotton Woven** | 65% – 70% | 2.5 – 4.0 bar | 70 – 75 Shore A |
| **100% Polyester Woven** | 35% – 45% | 3.5 – 5.0 bar | 75 – 80 Shore A |
| **P/C 65/35 Blend** | 55% – 60% | 3.0 – 4.5 bar | 70 – 75 Shore A |
| **100% Viscose / Rayon** | 75% – 85% | 2.0 – 3.5 bar | 65 – 70 Shore A |

---

## 3. Pad Trough Volume & Prevention of Tailing

### 3.1 Liquor Renewal / Replacement Time ($t_{\text{renewal}}$)
Tailing is the progressive shade change along the length of a fabric roll caused by differential dye affinity in the pad trough. To eliminate tailing, pad trough volume ($V_{\text{trough}}$) must be kept ultra-small:
$$t_{\text{renewal}} = \frac{V_{\text{trough}} \times 60}{v_{\text{speed}} \times m_{\text{fabric\_m}} \times (E\% / 100)}$$

*Where:*
- $t_{\text{renewal}}$ = Liquor replacement time in seconds (Must be **< 30 seconds**)
- $V_{\text{trough}}$ = Active liquor volume in pad trough (Liters, typically **10 – 25 L**)
- $v_{\text{speed}}$ = Fabric running speed (m/min, typically **30 – 80 m/min**)
- $m_{\text{fabric\_m}}$ = Fabric weight per linear meter (kg/m)

---

## 4. Fixation Chamber Machine Constraints

### 4.1 Steamer Chamber Constraints (Pad-Steam / Vat & Reactive Dyeing)
1. **Steam Quality & Temperature**: Saturated steam at **102°C – 104°C**. Superheated steam causes local drying and dye migration.
2. **Air / Oxygen Exclusion**:
   - Oxygen concentration inside steamer must be kept below **0.1%** for Vat and Sulfur reduction dyeing.
   - Steamer entry water lock / steam seal pressure must be positively regulated.
3. **Dwell Time**: Saturated steaming duration **45 to 90 seconds**.

### 4.2 Thermosol Unit Constraints (Disperse Dye Fixation on Polyester)
1. **Fixation Temperature**: **200°C to 215°C** (Precision within $\pm 1.5^\circ\text{C}$ across width).
2. **Exposure Dwell Time**: **45 to 60 seconds**.
3. **Infrared (IR) Pre-Drying**: Fabric leaving pad mangle must pass through an IR pre-dryer to reduce moisture content down to **25% – 30%** before contacting hot cylinders, preventing dye migration to fabric surface.

---

## 5. Machine Troubleshooting & Operational Matrix

| Defect / Anomaly | Machine Constraint Violation | Recommended Machine Adjustment |
| :--- | :--- | :--- |
| **Center-to-Selvedge Shade Variation** | Non-uniform pad mangle crown profile or deflection | Adjust swimming roll / Bicoflex pneumatic pressure profile |
| **Tailing (Head-to-Tail Shade Shift)** | Excess pad trough volume ($t_{\text{renewal}} > 45$ s) | Reduce trough volume displacement insert; increase running speed |
| **Surface Dye Migration Marks** | Bypassed or low IR pre-dryer temperature | Boost IR pre-dryer power; ensure 25% exit moisture target |
| **Incomplete Dye Reduction (Vat)** | Oxygen ingress inside continuous steamer vessel | Check steam seal locks; increase steam injection rate |
