# Package & Yarn Dyeing Machinery Constraints & Engineering Manual

## 1. Overview of Package Dyeing Dynamics
In yarn package dyeing, spooled yarn packages are loaded onto perforated dye spindles inside a pressurized cylindrical vessel. Dye liquor is forced radially through the yarn package walls under high pump pressure. Uniformity depends strictly on package density consistency, differential pressure control, and flow reversal cycles.

---

## 2. Key Mathematical Formulas & Physical Parameters

### 2.1 Package Density ($\rho_{\text{package}}$)
Package density is the single most critical variable determining liquor flow resistance and shade levelness:
$$\rho_{\text{package}} = \frac{m_{\text{yarn}}}{\pi \times (R_{\text{outer}}^2 - R_{\text{inner}}^2) \times h}$$

*Where:*
- $\rho_{\text{package}}$ = Density of wound package ($\text{g/cm}^3$)
- $m_{\text{yarn}}$ = Dry weight of yarn wound on tube (grams)
- $R_{\text{outer}}$ = Outer radius of wound package (cm)
- $R_{\text{inner}}$ = Outer radius of perforated dye tube (cm)
- $h$ = Height of yarn package traverse (cm)

### 2.2 Target Package Densities by Fiber Type
| Fiber Substrate | Target Density ($\text{g/cm}^3$) | Permissible Variation ($\pm$) | Hardness (Shore A / Durometer) |
| :--- | :--- | :--- | :--- |
| **Cotton (Spun Yarn)** | 0.32 – 0.38 $\text{g/cm}^3$ | $\pm 0.015 \text{ g/cm}^3$ | 45 – 55 |
| **100% Polyester (Textured)**| 0.38 – 0.42 $\text{g/cm}^3$ | $\pm 0.010 \text{ g/cm}^3$ | 55 – 65 |
| **Wool & Wool Blends** | 0.28 – 0.32 $\text{g/cm}^3$ | $\pm 0.015 \text{ g/cm}^3$ | 35 – 45 |
| **Acrylic (High Bulk)** | 0.26 – 0.30 $\text{g/cm}^3$ | $\pm 0.010 \text{ g/cm}^3$ | 30 – 40 |
| **Viscose Filament** | 0.40 – 0.45 $\text{g/cm}^3$ | $\pm 0.015 \text{ g/cm}^3$ | 60 – 70 |

> **Constraint Warning**: If package density variation within a single carrier column exceeds $\pm 5\%$, liquor will bypass dense packages and channel exclusively through soft packages, resulting in severe package-to-package shade variation.

---

## 3. Hydraulics & Flow Reversal Dynamics

### 3.1 Flow Directions (In-Out vs. Out-In)
- **Inside-to-Outside ($I \rightarrow O$)**: Liquor enters spindle core and flows outward through yarn package.
  - *Effect*: Tends to expand and loosen yarn layers; critical for early dye absorption stage.
- **Outside-to-Inside ($O \rightarrow I$)**: Liquor flows from main vessel tank inward through yarn package to spindle core.
  - *Effect*: Compresses yarn layers onto tube core; prevents yarn unraveling at high pump speed.

### 3.2 Standard Reversal Cycle Schedules
- **Cotton / Reactive Dyeing**:
  - $I \rightarrow O$: **4 minutes** | $O \rightarrow I$: **2 minutes** (Total 6 min cycle)
- **Polyester / HTHP Disperse Dyeing**:
  - $I \rightarrow O$: **5 minutes** | $O \rightarrow I$: **3 minutes** (Total 8 min cycle)
- **Acrylic / Cationic Dyeing**:
  - $I \rightarrow O$: **3 minutes** | $O \rightarrow I$: **3 minutes** (Equal 6 min cycle to ensure high leveling)

### 3.3 Differential Pressure ($\Delta P$) Limits
$$\Delta P = P_{\text{spindle}} - P_{\text{vessel}}$$

- **Normal Operational Range**: **0.8 bar to 1.4 bar**.
- **Low $\Delta P$ (< 0.5 bar)**: Indicates liquor bypass due to loose package column seating, tube collapse, or under-loaded spindles.
- **High $\Delta P$ (> 1.8 bar)**: Indicates over-compacted packages or dye/auxiliary precipitation clogging package inner layers.

---

## 4. Machine Hardware Constraints

### 4.1 Carrier Spindle & Spacing Constraints
1. **Compaction Press Pressure**: Columns of packages on dye spindles are hydraulically pressed before lock-nut securing.
   - Recommended Compaction Ratio: **12% to 18%** axial height reduction.
   - Excessive compaction (> 25%) damages yarn bulk and causes column bowing.
2. **Perforated Tube Open Area**: Dye tubes (rigid plastic or stainless steel spring tubes) must feature an open perforation area of **30% – 40%**.
3. **Liquor Pump Flow Rate**: Must maintain **35 – 50 L/kg/min** for spun yarns and **25 – 35 L/kg/min** for filament yarns.

---

## 5. Troubleshooting Package Machine Constraints

| Defect / Failure | Root Cause Machine Constraint | Corrective Action |
| :--- | :--- | :--- |
| **Inner-to-Outer Layer Shade Gradient** | Insufficient pump flow rate or excessive $O \rightarrow I$ ratio | Increase pump RPM; shift reversal ratio towards $I \rightarrow O$ |
| **Cross-over / Channel Markings** | Winding density too low (< 0.28 g/cm³) causing liquor blowout | Increase winding tension; adjust precision winding pattern |
| **Deformed / Squashed Tubes** | Excessive hydraulic column compaction or high thermal shrinkage | Reduce compaction pressure; use spring-type expandable tubes |
| **White Spotting / Precipitate** | High $\Delta P$ filtering dye agglomerates | Add effective dispersing agent; reduce thermal heating rate |
