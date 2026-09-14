# 01 ETP Process Flow

## Category Description
ETP Stage-by-Stage Process Flow, Unit Operations, and Flow Sequences

## Data Schema & Collected Fields
### 1. Process Information
- `Process Name`
- `Process Type`
- `Purpose`
- `Input Water Characteristics`
- `Output Water Characteristics`

### 2. Process Sequence
- `Previous Unit`
- `Current Unit`
- `Next Unit`
- `Flow Direction`
- `Operating Sequence`

### 3. Unit Operations
- `Treatment Stage`
- `Equipment Used`
- `Process Objective`

## Summary & Data Contents
- **Total Data Records**: 5
- **JSON Data File**: `data.json`
- **CSV Data File**: `data.csv`
- **Associated Source Reference Documents**:
  - `ManagingandMonitoringEffluenttreatmentplants_R8161_ETP.pdf`
  - `Winter 2026 ETP Develop Handbook.pdf`

---
### Data Record Preview

#### Record 1
- **Process Name**: Equalization and Screening
- **Process Type**: Physical
- **Purpose**: Remove coarse lint/fibers and smooth out pH/COD/flow spikes from batch dyeing.
- **Input Water Characteristics**: High pH (8.0-11.5), COD (1200-3500 mg/L), Temp (35-45°C), Variable flow & high color.
- **Output Water Characteristics**: Homogenized effluent, pH (8.5-10.0), Temp (< 40°C), Free of lint > 1.5mm.
- **Previous Unit**: Raw Effluent Collection Pit / Sump
- **Current Unit**: Equalization Tank & Bar/Drum Screen
- **Next Unit**: Flash Mixer / Primary Coagulation Tank
- **Flow Direction**: Continuous Gravity / Pumping
- **Operating Sequence**: Continuous 24/7 Screening & Air Agitation
- **Treatment Stage**: Pre-treatment
- **Equipment Used**: Coarse Bar Screen (15-20mm), Fine Rotary Drum Screen (1.5mm), Submerged Diffuser Blowers
- **Process Objective**: Protect downstream pumps, homogenize shock loads, prevent septic anaerobic conditions.

#### Record 2
- **Process Name**: Primary Coagulation & Flocculation
- **Process Type**: Chemical / Physical
- **Purpose**: Destabilize colloidal dye molecules and suspended solids to form settleable micro-flocs.
- **Input Water Characteristics**: Equalized effluent, High TSS (400-800 mg/L), High Color (1000-2500 PCU), COD (1500-2500 mg/L).
- **Output Water Characteristics**: Neutralized flocs, TSS reduction by 75-85%, COD reduction by 40-60%, Color reduced to < 500 PCU.
- **Previous Unit**: Equalization Tank Pump Stream
- **Current Unit**: Flash Mixer & Paddle Flocculator
- **Next Unit**: Primary Clarifier / Tube Settler
- **Flow Direction**: Continuous Overflow / Gravity
- **Operating Sequence**: Rapid Flash Mix (2 min) -> Slow Flocculation (20 min)
- **Treatment Stage**: Primary Treatment
- **Equipment Used**: High-speed Flash Mixer (200 RPM), Slow Paddle Flocculator (25 RPM), Dosing Pumps (Alum/PAC/Polyelectrolyte)
- **Process Objective**: Precipitate colloidal dyes and TSS prior to biological oxidation.

#### Record 3
- **Process Name**: Activated Sludge Aerobic Biological Oxidation
- **Process Type**: Biological
- **Purpose**: Bio-degrade dissolved organic pollutants (BOD & COD) using active bacterial biomass.
- **Input Water Characteristics**: Primary clarifier overflow, COD (800-1500 mg/L), BOD (300-600 mg/L), pH (6.8-7.5).
- **Output Water Characteristics**: BOD < 30 mg/L, COD < 250 mg/L, TSS < 100 mg/L, High DO (2-3 mg/L).
- **Previous Unit**: Primary Clarifier Supernatant Outlet
- **Current Unit**: Aeration Basin (ASP/MBBR/MBR)
- **Next Unit**: Secondary Clarifier / Membrane Bioreactor
- **Flow Direction**: Continuous Hydraulic Displacement
- **Operating Sequence**: Continuous Aeration & Bio-assimilation with RAS Recycle (75%)
- **Treatment Stage**: Secondary Treatment
- **Equipment Used**: Fine Bubble Membrane Diffusers, Roots Air Blowers, RAS/WAS Sludge Pumps, DO Controllers
- **Process Objective**: Convert soluble organic carbon into microbial biomass, CO2, and water.

