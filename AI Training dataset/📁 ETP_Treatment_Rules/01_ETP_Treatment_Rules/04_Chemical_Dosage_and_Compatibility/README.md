# 04 Chemical Dosage and Compatibility

## Category Description
Chemical Specifications, Dosing Calculation Rules, Compatibility & Operating Conditions

## Data Schema & Collected Fields
### 1. Chemical Details
- `Chemical Name`
- `Chemical Type`
- `Purpose`
- `Dosage Range`
- `Dosage Calculation Method`

### 2. Compatibility
- `Compatible Chemicals`
- `Incompatible Chemicals`
- `Addition Sequence`
- `Mixing Conditions`

### 3. Operating Conditions
- `Required pH`
- `Required Temperature`
- `Contact Time`

## Summary & Data Contents
- **Total Data Records**: 7
- **JSON Data File**: `data.json`
- **CSV Data File**: `data.csv`

---
### Data Record Preview

#### Record 1
- **Chemical Name**: Alum (Aluminum Sulfate - Al2(SO4)3·18H2O)
- **Chemical Type**: Primary Coagulant (Inorganic Salt)
- **Purpose**: Colloidal charge neutralization and primary dye/TSS precipitation.
- **Dosage Range**: 150 - 400 mg/L
- **Dosage Calculation Method**: Jar Test optimization: Dose (mg/L) = (Jar Opt Vol (mL) * Stock Conc (mg/mL)) / Sample Vol (L)
- **Compatible Chemicals**: Anionic Polyelectrolyte, Sulfuric Acid, PAC
- **Incompatible Chemicals**: Lime/Caustic (when dosed simultaneously prior to flash mixing)
- **Addition Sequence**: 1st Acid pre-neutralization -> 2nd Alum dosing -> 3rd Polymer dosing
- **Mixing Conditions**: High-shear Rapid Flash Mix (G > 300 s⁻¹, 200 RPM)
- **Required pH**: 6.0 - 7.5
- **Required Temperature**: 20°C - 40°C
- **Contact Time**: 2 - 5 Minutes

#### Record 2
- **Chemical Name**: Poly Aluminum Chloride (PAC)
- **Chemical Type**: Pre-hydrolyzed Inorganic Coagulant
- **Purpose**: Rapid floc formation, effective color reduction with lower sludge volume.
- **Dosage Range**: 100 - 300 mg/L
- **Dosage Calculation Method**: Dose = Feed Flow (m³/hr) * Target ppm / Active Purity %
- **Compatible Chemicals**: Cationic/Anionic Polymers, Sulfuric Acid
- **Incompatible Chemicals**: Strong Concentrated Alkalies
- **Addition Sequence**: Dose into Flash Mixer immediately after raw water pH adjustment
- **Mixing Conditions**: Rapid Mixing (G = 300-400 s⁻¹, 1-3 mins)
- **Required pH**: 6.5 - 8.5
- **Required Temperature**: 15°C - 45°C
- **Contact Time**: 1 - 3 Minutes

#### Record 3
- **Chemical Name**: Ferrous Sulfate (FeSO4·7H2O)
- **Chemical Type**: Inorganic Coagulant & Fenton Catalyst
- **Purpose**: Decolorization of sulfur/reactive dyes and catalyst for hydrogen peroxide radical oxidation.
- **Dosage Range**: 200 - 500 mg/L (Coagulation) / 300 - 600 mg/L (Fenton)
- **Dosage Calculation Method**: Molar ratio Fe²⁺ : H₂O₂ = 1:3 to 1:5 in Fenton reactor
- **Compatible Chemicals**: Hydrogen Peroxide, Sulfuric Acid, Lime
- **Incompatible Chemicals**: Oxidizers (prior to Fenton stage), High pH (> 4.0 during Fenton reaction)
- **Addition Sequence**: Fenton: 1st Acid to pH 3.2 -> 2nd FeSO4 -> 3rd H2O2 -> 4th Lime to pH 8.0
- **Mixing Conditions**: Continuous moderate agitation in acid-resistant reactor
- **Required pH**: 3.0 - 3.5 (Fenton Catalyst) / 8.5 - 10.0 (Coagulation precipitate)
- **Required Temperature**: 25°C - 38°C
- **Contact Time**: 60 - 90 Minutes

