import os
import json
import csv
import shutil

base_target = r"D:\PROJECT-TEXTILES\new etp data\01_ETP_Treatment_Rules"
src_root = r"D:\PROJECT-TEXTILES\ETP TREATMENT RULES"
src_cpcb = os.path.join(src_root, "CPCB (Central Pollution Control Board)")
src_data = os.path.join(src_root, "DATA collected from ANTIGRAVITY")

folders = [
    "00_Raw_Source_Data",
    "01_ETP_Process_Flow",
    "02_Treatment_Units",
    "03_Process_Parameters",
    "04_Chemical_Dosage_and_Compatibility",
    "05_Water_Quality_Standards",
    "06_Regulatory_Compliance",
    "07_Process_Constraints",
    "08_Troubleshooting_and_Corrective_Actions",
    "09_Sludge_Management",
    "10_Water_Reuse_and_Recycling",
    "11_Safety_and_Handling",
    "12_Best_Practices"
]

for f in folders:
    os.makedirs(os.path.join(base_target, f), exist_ok=True)

# Helper function to save folder datasets
def save_folder_data(folder_name, title, fields_dict, data_list, pdf_sources=None):
    folder_path = os.path.join(base_target, folder_name)
    
    # Save JSON
    json_path = os.path.join(folder_path, "data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            "category_folder": folder_name,
            "title": title,
            "field_definitions": fields_dict,
            "total_records": len(data_list),
            "data": data_list
        }, f, indent=2)
        
    # Save CSV
    csv_path = os.path.join(folder_path, "data.csv")
    if data_list and len(data_list) > 0:
        all_keys = []
        for item in data_list:
            for k in item.keys():
                if k not in all_keys:
                    all_keys.append(k)
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=all_keys)
            writer.writeheader()
            for row in data_list:
                writer.writerow(row)
                
    # Copy PDF Sources if any
    copied_pdfs = []
    if pdf_sources:
        for pdf_name in pdf_sources:
            found = False
            for s_dir in [src_root, src_cpcb, src_data]:
                sp = os.path.join(s_dir, pdf_name)
                if os.path.exists(sp):
                    shutil.copy2(sp, os.path.join(folder_path, pdf_name))
                    copied_pdfs.append(pdf_name)
                    found = True
                    break

    # Save README.md
    readme_path = os.path.join(folder_path, "README.md")
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(f"# {folder_name.replace('_', ' ')}\n\n")
        f.write(f"## Category Description\n{title}\n\n")
        f.write("## Data Schema & Collected Fields\n")
        for sec, f_list in fields_dict.items():
            f.write(f"### {sec}\n")
            for field in f_list:
                f.write(f"- `{field}`\n")
            f.write("\n")
        f.write("## Summary & Data Contents\n")
        f.write(f"- **Total Data Records**: {len(data_list)}\n")
        f.write(f"- **JSON Data File**: `data.json`\n")
        f.write(f"- **CSV Data File**: `data.csv`\n")
        if copied_pdfs:
            f.write("- **Associated Source Reference Documents**:\n")
            for p in copied_pdfs:
                f.write(f"  - `{p}`\n")
        f.write("\n---\n")
        f.write("### Data Record Preview\n\n")
        for idx, item in enumerate(data_list[:3], 1):
            f.write(f"#### Record {idx}\n")
            for k, v in item.items():
                f.write(f"- **{k}**: {v}\n")
            f.write("\n")

# Copy raw source data
raw_dir = os.path.join(base_target, "00_Raw_Source_Data")
for s_dir in [src_root, src_cpcb, src_data]:
    if os.path.exists(s_dir):
        for item in os.listdir(s_dir):
            sp = os.path.join(s_dir, item)
            if os.path.isfile(sp):
                shutil.copy2(sp, os.path.join(raw_dir, item))

print("Raw source data copied.")

# ---------------------------------------------------------
# FOLDER 01: 01_ETP_Process_Flow
# ---------------------------------------------------------
f01_fields = {
    "1. Process Information": ["Process Name", "Process Type", "Purpose", "Input Water Characteristics", "Output Water Characteristics"],
    "2. Process Sequence": ["Previous Unit", "Current Unit", "Next Unit", "Flow Direction", "Operating Sequence"],
    "3. Unit Operations": ["Treatment Stage", "Equipment Used", "Process Objective"]
}
f01_data = [
    {
        "Process Name": "Equalization and Screening",
        "Process Type": "Physical",
        "Purpose": "Remove coarse lint/fibers and smooth out pH/COD/flow spikes from batch dyeing.",
        "Input Water Characteristics": "High pH (8.0-11.5), COD (1200-3500 mg/L), Temp (35-45°C), Variable flow & high color.",
        "Output Water Characteristics": "Homogenized effluent, pH (8.5-10.0), Temp (< 40°C), Free of lint > 1.5mm.",
        "Previous Unit": "Raw Effluent Collection Pit / Sump",
        "Current Unit": "Equalization Tank & Bar/Drum Screen",
        "Next Unit": "Flash Mixer / Primary Coagulation Tank",
        "Flow Direction": "Continuous Gravity / Pumping",
        "Operating Sequence": "Continuous 24/7 Screening & Air Agitation",
        "Treatment Stage": "Pre-treatment",
        "Equipment Used": "Coarse Bar Screen (15-20mm), Fine Rotary Drum Screen (1.5mm), Submerged Diffuser Blowers",
        "Process Objective": "Protect downstream pumps, homogenize shock loads, prevent septic anaerobic conditions."
    },
    {
        "Process Name": "Primary Coagulation & Flocculation",
        "Process Type": "Chemical / Physical",
        "Purpose": "Destabilize colloidal dye molecules and suspended solids to form settleable micro-flocs.",
        "Input Water Characteristics": "Equalized effluent, High TSS (400-800 mg/L), High Color (1000-2500 PCU), COD (1500-2500 mg/L).",
        "Output Water Characteristics": "Neutralized flocs, TSS reduction by 75-85%, COD reduction by 40-60%, Color reduced to < 500 PCU.",
        "Previous Unit": "Equalization Tank Pump Stream",
        "Current Unit": "Flash Mixer & Paddle Flocculator",
        "Next Unit": "Primary Clarifier / Tube Settler",
        "Flow Direction": "Continuous Overflow / Gravity",
        "Operating Sequence": "Rapid Flash Mix (2 min) -> Slow Flocculation (20 min)",
        "Treatment Stage": "Primary Treatment",
        "Equipment Used": "High-speed Flash Mixer (200 RPM), Slow Paddle Flocculator (25 RPM), Dosing Pumps (Alum/PAC/Polyelectrolyte)",
        "Process Objective": "Precipitate colloidal dyes and TSS prior to biological oxidation."
    },
    {
        "Process Name": "Activated Sludge Aerobic Biological Oxidation",
        "Process Type": "Biological",
        "Purpose": "Bio-degrade dissolved organic pollutants (BOD & COD) using active bacterial biomass.",
        "Input Water Characteristics": "Primary clarifier overflow, COD (800-1500 mg/L), BOD (300-600 mg/L), pH (6.8-7.5).",
        "Output Water Characteristics": "BOD < 30 mg/L, COD < 250 mg/L, TSS < 100 mg/L, High DO (2-3 mg/L).",
        "Previous Unit": "Primary Clarifier Supernatant Outlet",
        "Current Unit": "Aeration Basin (ASP/MBBR/MBR)",
        "Next Unit": "Secondary Clarifier / Membrane Bioreactor",
        "Flow Direction": "Continuous Hydraulic Displacement",
        "Operating Sequence": "Continuous Aeration & Bio-assimilation with RAS Recycle (75%)",
        "Treatment Stage": "Secondary Treatment",
        "Equipment Used": "Fine Bubble Membrane Diffusers, Roots Air Blowers, RAS/WAS Sludge Pumps, DO Controllers",
        "Process Objective": "Convert soluble organic carbon into microbial biomass, CO2, and water."
    },
    {
        "Process Name": "Advanced Oxidation Process (Fenton Reaction)",
        "Process Type": "Chemical",
        "Purpose": "Break down non-biodegradable refractory COD and residual azo dye chromophores.",
        "Input Water Characteristics": "Secondary clarifier overflow, Hard COD (150-300 mg/L), Residual Color (100-300 PCU), Low BOD.",
        "Output Water Characteristics": "COD < 100 mg/L, Color < 30 PCU, Clear aqueous liquid.",
        "Previous Unit": "Secondary Clarifier Outlet",
        "Current Unit": "Fenton Reaction Tank & Neutralization Basin",
        "Next Unit": "Tertiary Clarifier & Dual Media Filter",
        "Flow Direction": "Gravity Flow",
        "Operating Sequence": "Acidification to pH 3.2 -> FeSO4/H2O2 Injection (90 min) -> Lime Neutralization to pH 8.0",
        "Treatment Stage": "Tertiary Treatment",
        "Equipment Used": "Acid-proof Dosing Pumps, Static Mixers, Agitated Fenton Reactor, Lime Slurry Unit",
        "Process Objective": "Generate hydroxyl radicals (•OH) to mineralize toxic complex organic structures."
    },
    {
        "Process Name": "Membrane Desalination & ZLD (UF -> RO -> MEE)",
        "Process Type": "Physical / Thermal",
        "Purpose": "Recover 93-95% high-purity water for textile process reuse and crystallize zero discharge dry salt.",
        "Input Water Characteristics": "Tertiary filtered effluent, TDS (4000-8000 mg/L), Turbidity < 0.5 NTU, SDI15 < 3.0.",
        "Output Water Characteristics": "RO Permeate TDS < 80 mg/L (Reused in Dye House), Dry Salt Powder (NaCl/Na2SO4).",
        "Previous Unit": "Activated Carbon Filter Outlet",
        "Current Unit": "UF Unit -> High Pressure RO -> MEE Evaporator & ATFD",
        "Next Unit": "Dye House Process Water Storage & TSDF Landfill",
        "Flow Direction": "Pressurized Cross-Flow -> Evaporative Concentration",
        "Operating Sequence": "UF Filtration -> 2-Stage RO -> 4-Effect Evaporator -> ATFD Crystallizer",
        "Treatment Stage": "Advanced ZLD Stage",
        "Equipment Used": "Hollow Fiber UF, Polyamide Spiral RO Modules, High Pressure Pumps (60 bar), MEE Evaporator, ATFD Dryer",
        "Process Objective": "Achieve Zero Liquid Discharge (ZLD) and 100% water recovery."
    }
]

save_folder_data(
    "01_ETP_Process_Flow",
    "ETP Stage-by-Stage Process Flow, Unit Operations, and Flow Sequences",
    f01_fields,
    f01_data,
    pdf_sources=["ManagingandMonitoringEffluenttreatmentplants_R8161_ETP.pdf", "Winter 2026 ETP Develop Handbook.pdf"]
)

# ---------------------------------------------------------
# FOLDER 02: 02_Treatment_Units
# ---------------------------------------------------------
f02_fields = {
    "Unit Details": ["Unit Name", "Unit Function", "Treatment Method", "Equipment Type", "Design Capacity"],
    "Operating Parameters": ["Flow Rate", "Hydraulic Retention Time (HRT)", "Mixing Time", "Aeration Requirement", "Operating Temperature", "Operating pH"],
    "Performance": ["Pollutants Removed", "Removal Efficiency", "Expected Output Quality"]
}
f02_data = [
    {
        "Unit Name": "Equalization Basin",
        "Unit Function": "Flow homogenization & pH balancing",
        "Treatment Method": "Physical Aerated Mixing",
        "Equipment Type": "Submerged Coarse Diffuser & Rotary Drum Screen",
        "Design Capacity": "2,400 m³/day (100 m³/hr)",
        "Flow Rate": "100 m³/hr",
        "Hydraulic Retention Time (HRT)": "16 - 24 Hours",
        "Mixing Time": "Continuous 24/7",
        "Aeration Requirement": "1.8 m³/m²/hr Air Supply",
        "Operating Temperature": "30°C - 42°C",
        "Operating pH": "8.0 - 11.0",
        "Pollutants Removed": "Coarse Fibers, Lint, Suspended Solids > 1.5mm, Thermal Spikes",
        "Removal Efficiency": "100% Lint > 1.5mm, 10-15% COD reduction",
        "Expected Output Quality": "Equalized Flow, pH 8.5-9.5, Temp < 40°C"
    },
    {
        "Unit Name": "Primary Coagator & Tube Settler",
        "Unit Function": "Physico-chemical color and TSS coagulation",
        "Treatment Method": "Chemical Coagulation & Flocculation",
        "Equipment Type": "Flash Mixer, Paddle Flocculator & Chevron Tube Settler",
        "Design Capacity": "100 m³/hr",
        "Flow Rate": "100 m³/hr",
        "Hydraulic Retention Time (HRT)": "2.5 Hours (2 min Flash, 20 min Floc, 2 hr Settling)",
        "Mixing Time": "2 min (Rapid) + 20 min (Slow)",
        "Aeration Requirement": "None (Mechanical Agitation)",
        "Operating Temperature": "30°C - 38°C",
        "Operating pH": "6.8 - 7.2 (Alum/PAC) or 9.0 (Lime)",
        "Pollutants Removed": "Suspended Solids, Colloidal Dye Molecules, Heavy Metals",
        "Removal Efficiency": "80% TSS, 50% COD, 70% Color",
        "Expected Output Quality": "TSS < 150 mg/L, COD < 1000 mg/L, Clear supernatant"
    },
    {
        "Unit Name": "Activated Sludge Aeration Tank",
        "Unit Function": "Biological organic carbon bio-degradation",
        "Treatment Method": "Aerobic Biological Activated Sludge Process (ASP)",
        "Equipment Type": "Fine Bubble EPDM Diffusers & Roots Blowers",
        "Design Capacity": "100 m³/hr",
        "Flow Rate": "100 m³/hr",
        "Hydraulic Retention Time (HRT)": "18 - 24 Hours",
        "Mixing Time": "Continuous Aeration",
        "Aeration Requirement": "DO maintained at 2.0 - 3.0 mg/L",
        "Operating Temperature": "28°C - 35°C",
        "Operating pH": "6.8 - 7.8",
        "Pollutants Removed": "BOD5, Soluble COD, Organic Nitrogen, Surfactants",
        "Removal Efficiency": "90-95% BOD, 75-85% COD",
        "Expected Output Quality": "BOD < 30 mg/L, COD < 250 mg/L, MLSS 3800 mg/L"
    },
    {
        "Unit Name": "Fenton Advanced Oxidation Reactor",
        "Unit Function": "Refractory hard COD mineralization and color destruction",
        "Treatment Method": "Advanced Chemical Oxidation (•OH Radicals)",
        "Equipment Type": "Fenton Agitated Tank, Acid/Peroxide Dosing Pumps, Neutralizer",
        "Design Capacity": "100 m³/hr",
        "Flow Rate": "100 m³/hr",
        "Hydraulic Retention Time (HRT)": "1.5 - 2.0 Hours",
        "Mixing Time": "90 Minutes Reaction Time",
        "Aeration Requirement": "None (Chemical Hydroxyl Oxidation)",
        "Operating Temperature": "25°C - 35°C",
        "Operating pH": "3.0 - 3.5 (Reaction) -> 8.0 (Neutralization)",
        "Pollutants Removed": "Refractory Azo Dyes, Phenols, Residual Hard COD",
        "Removal Efficiency": "85-95% Color, 60-75% Hard COD",
        "Expected Output Quality": "COD < 80 mg/L, Color < 30 PCU, Colorless Effluent"
    },
    {
        "Unit Name": "High-Pressure Reverse Osmosis (RO) Unit",
        "Unit Function": "Dissolved salt separation and high-purity water recovery",
        "Treatment Method": "Membrane Hyper-Filtration / Desalination",
        "Equipment Type": "Polyamide TFC Spiral Wound Membranes, High Pressure Pumps",
        "Design Capacity": "95 m³/hr Permeate Recovery",
        "Flow Rate": "100 m³/hr Feed",
        "Hydraulic Retention Time (HRT)": "Continuous Inline (Seconds)",
        "Mixing Time": "High Velocity Cross-Flow Stream",
        "Aeration Requirement": "None",
        "Operating Temperature": "25°C - 35°C",
        "Operating pH": "6.0 - 7.5",
        "Pollutants Removed": "TDS, Chloride, Sulfate, Sodium, Micro-pollutants",
        "Removal Efficiency": "98.5-99.2% Salt Rejection",
        "Expected Output Quality": "RO Permeate TDS < 80 mg/L, Conductivity < 150 µS/cm"
    },
    {
        "Unit Name": "Multiple Effect Evaporator (MEE) & ATFD",
        "Unit Function": "RO Reject brine concentration and dry salt powder crystallization",
        "Treatment Method": "Thermal Vacuum Falling Film & Forced Circulation Evaporation",
        "Equipment Type": "4-Effect MEE Evaporator & Agitated Thin Film Dryer (ATFD)",
        "Design Capacity": "7 m³/hr RO Reject Feed",
        "Flow Rate": "7 m³/hr",
        "Hydraulic Retention Time (HRT)": "Evaporation Loop (4-6 Hours)",
        "Mixing Time": "Continuous Forced Recirculation",
        "Aeration Requirement": "Vacuum Pressure (650-680 mmHg)",
        "Operating Temperature": "60°C - 90°C",
        "Operating pH": "7.0 - 8.5",
        "Pollutants Removed": "Concentrated Dissolved Salts (TDS 70,000 to 350,000 mg/L)",
        "Removal Efficiency": "100% Water Condensate Recovery, Dry Salt Crystals",
        "Expected Output Quality": "Condensate TDS < 50 mg/L, Dry NaCl/Na2SO4 Salt (< 2% Moisture)"
    }
]

save_folder_data(
    "02_Treatment_Units",
    "Comprehensive Specifications for ETP Physical, Chemical, Biological, and Membrane Units",
    f02_fields,
    f02_data,
    pdf_sources=["ManagingandMonitoringEffluenttreatmentplants_R8161_ETP.pdf"]
)

# ---------------------------------------------------------
# FOLDER 03: 03_Process_Parameters
# ---------------------------------------------------------
f03_fields = {
    "Parameters Collected": ["Parameter Name", "pH Range", "Temperature Range", "Flow Rate", "COD Range (mg/L)", "BOD Range (mg/L)", "TDS Range (mg/L)", "TSS Range (mg/L)", "Turbidity (NTU)", "DO (mg/L)", "ORP (mV)", "Conductivity (µS/cm)", "Retention Time"]
}
f03_data = [
    {
        "Parameter Name": "Raw Effluent Feed",
        "pH Range": "8.0 - 11.5",
        "Temperature Range": "35°C - 48°C",
        "Flow Rate": "100 m³/hr",
        "COD Range (mg/L)": "1,200 - 3,500",
        "BOD Range (mg/L)": "300 - 900",
        "TDS Range (mg/L)": "4,000 - 12,000",
        "TSS Range (mg/L)": "400 - 900",
        "Turbidity (NTU)": "150 - 400",
        "DO (mg/L)": "0.0 - 0.5",
        "ORP (mV)": "-150 to -50",
        "Conductivity (µS/cm)": "6,000 - 18,000",
        "Retention Time": "1 - 2 Hours (Sump)"
    },
    {
        "Parameter Name": "Equalization Basin Outlet",
        "pH Range": "8.5 - 9.5",
        "Temperature Range": "32°C - 38°C",
        "Flow Rate": "100 m³/hr",
        "COD Range (mg/L)": "1,500 - 2,500",
        "BOD Range (mg/L)": "400 - 650",
        "TDS Range (mg/L)": "5,000 - 9,000",
        "TSS Range (mg/L)": "350 - 600",
        "Turbidity (NTU)": "100 - 250",
        "DO (mg/L)": "0.5 - 1.0",
        "ORP (mV)": "-50 to +50",
        "Conductivity (µS/cm)": "8,000 - 14,000",
        "Retention Time": "16 - 24 Hours"
    },
    {
        "Parameter Name": "Primary Clarifier Supernatant",
        "pH Range": "6.8 - 7.5",
        "Temperature Range": "30°C - 36°C",
        "Flow Rate": "100 m³/hr",
        "COD Range (mg/L)": "800 - 1,400",
        "BOD Range (mg/L)": "250 - 450",
        "TDS Range (mg/L)": "5,200 - 9,500",
        "TSS Range (mg/L)": "80 - 150",
        "Turbidity (NTU)": "30 - 60",
        "DO (mg/L)": "0.8 - 1.5",
        "ORP (mV)": "+50 to +100",
        "Conductivity (µS/cm)": "8,200 - 14,500",
        "Retention Time": "2.5 Hours"
    },
    {
        "Parameter Name": "Aeration Basin Mixed Liquor",
        "pH Range": "6.8 - 7.8",
        "Temperature Range": "28°C - 34°C",
        "Flow Rate": "100 m³/hr (+75 m³/hr RAS)",
        "COD Range (mg/L)": "300 - 600 (Tank ML)",
        "BOD Range (mg/L)": "50 - 120 (Tank ML)",
        "TDS Range (mg/L)": "5,000 - 9,200",
        "TSS Range (mg/L)": "3,000 - 4,500 (MLSS)",
        "Turbidity (NTU)": "N/A (Mixed Liquor)",
        "DO (mg/L)": "2.0 - 3.0 strictly",
        "ORP (mV)": "+150 to +250",
        "Conductivity (µS/cm)": "8,000 - 14,000",
        "Retention Time": "18 - 24 Hours"
    },
    {
        "Parameter Name": "Secondary Clarifier Overflow",
        "pH Range": "7.0 - 7.6",
        "Temperature Range": "28°C - 33°C",
        "Flow Rate": "100 m³/hr",
        "COD Range (mg/L)": "150 - 250",
        "BOD Range (mg/L)": "15 - 30",
        "TDS Range (mg/L)": "5,000 - 9,000",
        "TSS Range (mg/L)": "20 - 40",
        "Turbidity (NTU)": "10 - 20",
        "DO (mg/L)": "2.0 - 2.5",
        "ORP (mV)": "+180 to +220",
        "Conductivity (µS/cm)": "8,000 - 14,000",
        "Retention Time": "3 - 4 Hours"
    },
    {
        "Parameter Name": "Fenton & Tertiary ACF Filter Outlet",
        "pH Range": "6.8 - 7.4",
        "Temperature Range": "26°C - 32°C",
        "Flow Rate": "100 m³/hr",
        "COD Range (mg/L)": "40 - 80",
        "BOD Range (mg/L)": "< 5",
        "TDS Range (mg/L)": "5,500 - 9,800",
        "TSS Range (mg/L)": "< 5",
        "Turbidity (NTU)": "< 2.0",
        "DO (mg/L)": "3.5 - 5.0",
        "ORP (mV)": "+200 to +300",
        "Conductivity (µS/cm)": "8,500 - 15,000",
        "Retention Time": "1.5 Hours"
    },
    {
        "Parameter Name": "Ultrafiltration (UF) Permeate",
        "pH Range": "6.5 - 7.5",
        "Temperature Range": "25°C - 35°C",
        "Flow Rate": "95 m³/hr",
        "COD Range (mg/L)": "< 30",
        "BOD Range (mg/L)": "0.0",
        "TDS Range (mg/L)": "5,500 - 9,800",
        "TSS Range (mg/L)": "0.0 (SDI15 < 2.5)",
        "Turbidity (NTU)": "< 0.2",
        "DO (mg/L)": "4.0 - 5.5",
        "ORP (mV)": "+150 to +200",
        "Conductivity (µS/cm)": "8,500 - 15,000",
        "Retention Time": "Continuous Inline"
    },
    {
        "Parameter Name": "RO Stage 1 & Stage 2 Permeate",
        "pH Range": "6.5 - 7.2",
        "Temperature Range": "25°C - 35°C",
        "Flow Rate": "93 m³/hr",
        "COD Range (mg/L)": "0.0",
        "BOD Range (mg/L)": "0.0",
        "TDS Range (mg/L)": "30 - 80",
        "TSS Range (mg/L)": "0.0",
        "Turbidity (NTU)": "< 0.05",
        "DO (mg/L)": "5.0 - 6.5",
        "ORP (mV)": "+150 to +180",
        "Conductivity (µS/cm)": "50 - 120",
        "Retention Time": "Continuous Inline"
    },
    {
        "Parameter Name": "RO Reject Brine",
        "pH Range": "7.2 - 8.2",
        "Temperature Range": "28°C - 38°C",
        "Flow Rate": "7 m³/hr",
        "COD Range (mg/L)": "300 - 600",
        "BOD Range (mg/L)": "< 20",
        "TDS Range (mg/L)": "70,000 - 100,000",
        "TSS Range (mg/L)": "10 - 30",
        "Turbidity (NTU)": "5 - 15",
        "DO (mg/L)": "1.0 - 2.0",
        "ORP (mV)": "+100 to +150",
        "Conductivity (µS/cm)": "95,000 - 140,000",
        "Retention Time": "Continuous Stream"
    }
]

save_folder_data(
    "03_Process_Parameters",
    "Comprehensive Operating Matrix of ETP Process Parameters Across Treatment Stages",
    f03_fields,
    f03_data,
    pdf_sources=["Performance evaluation of effluent treatment plant.pdf"]
)

# ---------------------------------------------------------
# FOLDER 04: 04_Chemical_Dosage_and_Compatibility
# ---------------------------------------------------------
f04_fields = {
    "1. Chemical Details": ["Chemical Name", "Chemical Type", "Purpose", "Dosage Range", "Dosage Calculation Method"],
    "2. Compatibility": ["Compatible Chemicals", "Incompatible Chemicals", "Addition Sequence", "Mixing Conditions"],
    "3. Operating Conditions": ["Required pH", "Required Temperature", "Contact Time"]
}
f04_data = [
    {
        "Chemical Name": "Alum (Aluminum Sulfate - Al2(SO4)3·18H2O)",
        "Chemical Type": "Primary Coagulant (Inorganic Salt)",
        "Purpose": "Colloidal charge neutralization and primary dye/TSS precipitation.",
        "Dosage Range": "150 - 400 mg/L",
        "Dosage Calculation Method": "Jar Test optimization: Dose (mg/L) = (Jar Opt Vol (mL) * Stock Conc (mg/mL)) / Sample Vol (L)",
        "Compatible Chemicals": "Anionic Polyelectrolyte, Sulfuric Acid, PAC",
        "Incompatible Chemicals": "Lime/Caustic (when dosed simultaneously prior to flash mixing)",
        "Addition Sequence": "1st Acid pre-neutralization -> 2nd Alum dosing -> 3rd Polymer dosing",
        "Mixing Conditions": "High-shear Rapid Flash Mix (G > 300 s⁻¹, 200 RPM)",
        "Required pH": "6.0 - 7.5",
        "Required Temperature": "20°C - 40°C",
        "Contact Time": "2 - 5 Minutes"
    },
    {
        "Chemical Name": "Poly Aluminum Chloride (PAC)",
        "Chemical Type": "Pre-hydrolyzed Inorganic Coagulant",
        "Purpose": "Rapid floc formation, effective color reduction with lower sludge volume.",
        "Dosage Range": "100 - 300 mg/L",
        "Dosage Calculation Method": "Dose = Feed Flow (m³/hr) * Target ppm / Active Purity %",
        "Compatible Chemicals": "Cationic/Anionic Polymers, Sulfuric Acid",
        "Incompatible Chemicals": "Strong Concentrated Alkalies",
        "Addition Sequence": "Dose into Flash Mixer immediately after raw water pH adjustment",
        "Mixing Conditions": "Rapid Mixing (G = 300-400 s⁻¹, 1-3 mins)",
        "Required pH": "6.5 - 8.5",
        "Required Temperature": "15°C - 45°C",
        "Contact Time": "1 - 3 Minutes"
    },
    {
        "Chemical Name": "Ferrous Sulfate (FeSO4·7H2O)",
        "Chemical Type": "Inorganic Coagulant & Fenton Catalyst",
        "Purpose": "Decolorization of sulfur/reactive dyes and catalyst for hydrogen peroxide radical oxidation.",
        "Dosage Range": "200 - 500 mg/L (Coagulation) / 300 - 600 mg/L (Fenton)",
        "Dosage Calculation Method": "Molar ratio Fe²⁺ : H₂O₂ = 1:3 to 1:5 in Fenton reactor",
        "Compatible Chemicals": "Hydrogen Peroxide, Sulfuric Acid, Lime",
        "Incompatible Chemicals": "Oxidizers (prior to Fenton stage), High pH (> 4.0 during Fenton reaction)",
        "Addition Sequence": "Fenton: 1st Acid to pH 3.2 -> 2nd FeSO4 -> 3rd H2O2 -> 4th Lime to pH 8.0",
        "Mixing Conditions": "Continuous moderate agitation in acid-resistant reactor",
        "Required pH": "3.0 - 3.5 (Fenton Catalyst) / 8.5 - 10.0 (Coagulation precipitate)",
        "Required Temperature": "25°C - 38°C",
        "Contact Time": "60 - 90 Minutes"
    },
    {
        "Chemical Name": "Anionic Polyacrylamide (PAM Polymer)",
        "Chemical Type": "High Molecular Weight Flocculant",
        "Purpose": "Bridging micro-flocs into dense settleable macro-flocs in tube settlers.",
        "Dosage Range": "0.5 - 2.0 mg/L",
        "Dosage Calculation Method": "0.1% Stock Solution preparation with 45 min aging time",
        "Compatible Chemicals": "Alum, PAC, Ferrous Sulfate",
        "Incompatible Chemicals": "High concentration Oxidants, Cationic Polymers (cause mutual precipitation)",
        "Addition Sequence": "Dose at entrance to Flocculator paddle chamber AFTER coagulant flash mixing",
        "Mixing Conditions": "Low-shear gentle mixing (G = 20-50 s⁻¹, 15-30 RPM)",
        "Required pH": "6.0 - 9.0",
        "Required Temperature": "15°C - 40°C",
        "Contact Time": "15 - 30 Minutes"
    },
    {
        "Chemical Name": "Hydrogen Peroxide (H2O2 35% w/w)",
        "Chemical Type": "Strong Oxidizing Chemical Agent",
        "Purpose": "Generate free hydroxyl radicals (•OH) for refractory dye ring destruction.",
        "Dosage Range": "500 - 1500 mg/L",
        "Dosage Calculation Method": "Based on residual hard COD: 1.5 - 2.5 g H2O2 per gram COD to be removed",
        "Compatible Chemicals": "Ferrous Sulfate, Sulfuric Acid",
        "Incompatible Chemicals": "Reducing Agents (SMBS), Alkaline Solutions, Organic Contaminants in storage",
        "Addition Sequence": "Dose strictly AFTER FeSO4 addition under acidic conditions pH 3.2",
        "Mixing Conditions": "Continuous uniform agitation in vented reactor tank",
        "Required pH": "3.0 - 3.5 strictly",
        "Required Temperature": "25°C - 35°C",
        "Contact Time": "60 - 90 Minutes"
    },
    {
        "Chemical Name": "Sodium Metabisulfite (SMBS - Na2S2O5)",
        "Chemical Type": "Dechlorinating Reducing Agent",
        "Purpose": "Neutralize residual free chlorine to protect polyamide RO membranes from oxidation.",
        "Dosage Range": "2.0 - 5.0 mg/L (1.47 mg SMBS per 1.0 mg Free Chlorine)",
        "Dosage Calculation Method": "Continuous ORP feedback dosing: Target ORP < 200 mV",
        "Compatible Chemicals": "RO Polycarboxylate Antiscalant",
        "Incompatible Chemicals": "Hydrogen Peroxide, Ozone, Chlorine Gas, Sodium Hypochlorite",
        "Addition Sequence": "Dose in-line into UF Permeate pipe stream prior to RO High Pressure Pump",
        "Mixing Conditions": "In-line Static Mixer (High Velocity)",
        "Required pH": "6.0 - 7.5",
        "Required Temperature": "20°C - 35°C",
        "Contact Time": "1 - 2 Minutes Inline"
    },
    {
        "Chemical Name": "RO Polycarboxylate Antiscalant",
        "Chemical Type": "Threshold Scale Inhibitor & Dispersant",
        "Purpose": "Prevent precipitation of CaSO4, CaCO3, BaSO4, and Silica on RO membranes.",
        "Dosage Range": "3.0 - 6.0 mg/L",
        "Dosage Calculation Method": "Projection software calculation based on RO feed brine ion solubility product",
        "Compatible Chemicals": "SMBS (Dechlorinator)",
        "Incompatible Chemicals": "Cationic Coagulants / Polymers (causes irreversible membrane fouling)",
        "Addition Sequence": "Dose continuously into RO feed line interlocked with RO High Pressure Pump",
        "Mixing Conditions": "Inline turbulent mixing stream",
        "Required pH": "5.5 - 7.5",
        "Required Temperature": "20°C - 38°C",
        "Contact Time": "Continuous Inline"
    }
]

save_folder_data(
    "04_Chemical_Dosage_and_Compatibility",
    "Chemical Specifications, Dosing Calculation Rules, Compatibility & Operating Conditions",
    f04_fields,
    f04_data
)

# ---------------------------------------------------------
# FOLDER 05: 05_Water_Quality_Standards
# ---------------------------------------------------------
f05_fields = {
    "Standard Specifications": ["Parameter Name", "Acceptable Range", "Maximum Limit", "Minimum Limit", "Unit of Measurement", "Sampling Method", "Testing Frequency", "Applicable Standard"]
}
f05_data = [
    {
        "Parameter Name": "pH",
        "Acceptable Range": "6.5 - 8.5",
        "Maximum Limit": "8.5",
        "Minimum Limit": "6.5",
        "Unit of Measurement": "pH Units",
        "Sampling Method": "Continuous Sensor / Grab",
        "Testing Frequency": "Continuous Online / Hourly",
        "Applicable Standard": "CPCB Inland Surface Water / IS 2490"
    },
    {
        "Parameter Name": "Chemical Oxygen Demand (COD)",
        "Acceptable Range": "0 - 250",
        "Maximum Limit": "250.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "24-hr Composite Auto Sampler",
        "Testing Frequency": "Continuous Online / Daily",
        "Applicable Standard": "CPCB Environmental Standards 1986"
    },
    {
        "Parameter Name": "Biological Oxygen Demand (BOD 3d @ 27°C)",
        "Acceptable Range": "0 - 30",
        "Maximum Limit": "30.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "24-hr Composite Sampler",
        "Testing Frequency": "Daily Incubation",
        "Applicable Standard": "CPCB Gazette Notification 2016"
    },
    {
        "Parameter Name": "Total Suspended Solids (TSS)",
        "Acceptable Range": "0 - 100",
        "Maximum Limit": "100.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Composite / Gravimetric",
        "Testing Frequency": "Daily Gravimetric / Online Turbidity",
        "Applicable Standard": "CPCB Discharge Norms"
    },
    {
        "Parameter Name": "Total Dissolved Solids (TDS)",
        "Acceptable Range": "0 - 2100",
        "Maximum Limit": "2100.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Continuous Conductivity probe",
        "Testing Frequency": "Continuous Online",
        "Applicable Standard": "SPCB Inland Discharge Limit"
    },
    {
        "Parameter Name": "Oil & Grease",
        "Acceptable Range": "0 - 10",
        "Maximum Limit": "10.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Grab (Glass Bottle)",
        "Testing Frequency": "Weekly Solvent Extraction",
        "Applicable Standard": "IS 3025 Part 39"
    },
    {
        "Parameter Name": "Color",
        "Acceptable Range": "0 - 150",
        "Maximum Limit": "150.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "PCU (Pt-Co Units)",
        "Sampling Method": "Grab Sample",
        "Testing Frequency": "Daily Spectrophotometer",
        "Applicable Standard": "CPCB Color Standard"
    },
    {
        "Parameter Name": "Total Chromium (as Cr)",
        "Acceptable Range": "0 - 2.0",
        "Maximum Limit": "2.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Composite Sample",
        "Testing Frequency": "Weekly Atomic Absorption (AAS)",
        "Applicable Standard": "CPCB Heavy Metal Norms"
    },
    {
        "Parameter Name": "Sulfide (as S)",
        "Acceptable Range": "0 - 2.0",
        "Maximum Limit": "2.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Preserved Titrametric Grab",
        "Testing Frequency": "Daily Iodometric Titration",
        "Applicable Standard": "IS 3025 Part 29"
    },
    {
        "Parameter Name": "Phenolic Compounds (as C6H5OH)",
        "Acceptable Range": "0 - 1.0",
        "Maximum Limit": "1.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Composite Glass Bottle",
        "Testing Frequency": "Weekly Colorimetric Method",
        "Applicable Standard": "CPCB Environmental Protection Rules"
    },
    {
        "Parameter Name": "Zero Liquid Discharge (ZLD) RO Permeate TDS",
        "Acceptable Range": "0 - 100",
        "Maximum Limit": "100.0",
        "Minimum Limit": "0.0",
        "Unit of Measurement": "mg/L",
        "Sampling Method": "Continuous EC Analyzer",
        "Testing Frequency": "Continuous 24/7",
        "Applicable Standard": "State Pollution Control Board ZLD Mandate"
    }
]

save_folder_data(
    "05_Water_Quality_Standards",
    "Regulatory and Industry Water Quality Standards and Parameter Threshold Limits",
    f05_fields,
    f05_data,
    pdf_sources=["An Introduction to Aquatic Bio-monitoring Using Macro-Invertibrate.pdf"]
)

# ---------------------------------------------------------
# FOLDER 06: 06_Regulatory_Compliance
# ---------------------------------------------------------
f06_fields = {
    "Compliance Guidelines": ["Regulation Name", "Regulatory Authority", "Applicable Industry", "Compliance Requirements", "Discharge Standards", "Water Reuse Standards", "Reporting Requirements", "Inspection Frequency"]
}
f06_data = [
    {
        "Regulation Name": "CPCB Comprehensive Environmental Pollution Index (CEPI) & ZLD Directives",
        "Regulatory Authority": "Central Pollution Control Board (CPCB) India",
        "Applicable Industry": "Textile Wet Processing, Dyeing & Bleaching Units",
        "Compliance Requirements": "Mandatory installation of Zero Liquid Discharge (ZLD) systems for units discharging > 25 KLD in Ganga & Cauvery river basins.",
        "Discharge Standards": "Zero Liquid Discharge (0.0 KLD liquid discharge outside unit premises)",
        "Water Reuse Standards": "RO Permeate TDS < 100 mg/L (100% recycled back into dye house process)",
        "Reporting Requirements": "Real-time Online Continuous Effluent Monitoring System (OCEMS) data streaming to CPCB server",
        "Inspection Frequency": "Quarterly Unannounced Regulatory Inspections"
    },
    {
        "Regulation Name": "Water (Prevention and Control of Pollution) Act 1974 & Consent to Operate (CTO)",
        "Regulatory Authority": "State Pollution Control Board (SPCB / TNPCB / GPCB)",
        "Applicable Industry": "All Textile Processing and Finishing Mills",
        "Compliance Requirements": "Valid Consent to Establish (CTE) & Consent to Operate (CTO); compliance with flow meters and logbook records.",
        "Discharge Standards": "BOD ≤ 30 mg/L, COD ≤ 250 mg/L, TSS ≤ 100 mg/L, pH 6.5 - 8.5",
        "Water Reuse Standards": "Specific water consumption ≤ 80 L/kg fabric processed",
        "Reporting Requirements": "Monthly Environmental Audit Report & Annual Environmental Statement (Form V)",
        "Inspection Frequency": "Bi-Annual SPCB Audit"
    },
    {
        "Regulation Name": "Hazardous and Other Wastes (Management and Transboundary Movement) Rules 2016",
        "Regulatory Authority": "MoEFCC & SPCB Hazardous Waste Management Cell",
        "Applicable Industry": "Textile ETP Operating Units",
        "Compliance Requirements": "Safe storage, manifest tracking, and disposal of ETP chemical sludge & MEE dry salts at authorized TSDF facilities.",
        "Discharge Standards": "Sludge Leachate heavy metal content within Schedule II TCLP limits",
        "Water Reuse Standards": "N/A (Solid Hazardous Waste)",
        "Reporting Requirements": "Annual Hazardous Waste Return (Form 4) & Manifest Form 10",
        "Inspection Frequency": "Annual TSDF Manifest Audit"
    },
    {
        "Regulation Name": "Standard Operating Procedure (SOP) for Issuance of ZLD Certificates",
        "Regulatory Authority": "CPCB & State Water Resources Authorities",
        "Applicable Industry": "Textile Clusters (Tirupur, Surat, Ludhiana, Pali, Ahmedabad)",
        "Compliance Requirements": "Installation of magnetic flow meters on raw water intake, RO permeate line, MEE condensate line, and reject stream.",
        "Discharge Standards": "Absolute Zero Discharge into storm drains or inland water bodies",
        "Water Reuse Standards": "RO Recovery ≥ 90%, MEE Condensate Recovery ≥ 95%",
        "Reporting Requirements": "Electromagnetic Flowmeter telemetry logged every 15 minutes to SPCB portal",
        "Inspection Frequency": "Monthly ZLD Telemetry Audit"
    }
]

save_folder_data(
    "06_Regulatory_Compliance",
    "National and State Regulatory Frameworks, ZLD Mandates, and Statutory Compliance Standards",
    f06_fields,
    f06_data,
    pdf_sources=[
        "Assessment of the Need for Common Effluent Treatment Plants.pdf",
        "Framework on National Environmental Training program for State Pollution Control Boards & Pollution Control Committees.pdf",
        "National Inventory of Sewage Treatment Plants 2021.pdf",
        "Performance Status of Common Effluent Treatment Plants in India.pdf",
        "Polluted River Stretches for Restoration of Water Quality -2022.pdf",
        "SOP for issuance of ZLD certificate.pdf"
    ]
)

# ---------------------------------------------------------
# FOLDER 07: 07_Process_Constraints
# ---------------------------------------------------------
f07_fields = {
    "Operating Limits & Constraints": ["Constraint Description", "Minimum Flow Rate", "Maximum Flow Rate", "Temperature Limits", "pH Limits", "Chemical Limits", "Loading Limits", "Hydraulic Constraints", "Biological Constraints", "Equipment Constraints", "Seasonal Constraints"]
}
f07_data = [
    {
        "Constraint Description": "Biological Aeration Basin Thermal & Operational Envelope",
        "Minimum Flow Rate": "50 m³/hr (50% design turn-down)",
        "Maximum Flow Rate": "120 m³/hr (120% peak flow limit)",
        "Temperature Limits": "Strictly < 40°C (Bacteria die > 42°C)",
        "pH Limits": "6.5 - 8.0 (Optimal biomass activity)",
        "Chemical Limits": "Free Chlorine = 0.0 mg/L; Heavy metals < 1.0 mg/L",
        "Loading Limits": "F/M Ratio: 0.15 - 0.30 kg BOD/kg MLVSS/day",
        "Hydraulic Constraints": "Min HRT 18 Hours; Max Surface Overflow Rate 1.0 m³/m²/hr in clarifier",
        "Biological Constraints": "DO maintained strictly between 2.0 and 3.0 mg/L; MLSS 3,500 - 4,500 mg/L",
        "Equipment Constraints": "Blower VFD minimum frequency 30 Hz to prevent motor overheating",
        "Seasonal Constraints": "Summer: Activate cooling tower if feed temp > 40°C; Winter: Maintain bio-temp > 22°C"
    },
    {
        "Constraint Description": "Ultrafiltration & Reverse Osmosis Membrane Envelope",
        "Minimum Flow Rate": "70 m³/hr RO Feed",
        "Maximum Flow Rate": "105 m³/hr RO Feed",
        "Temperature Limits": "15°C - 40°C (Membrane degradation > 45°C)",
        "pH Limits": "3.0 - 10.0 (RO Cleaning) / 6.0 - 7.5 (Continuous Operating)",
        "Chemical Limits": "Free Chlorine = 0.0 mg/L (ORP < 200 mV); Oil & Grease = 0.0 mg/L",
        "Loading Limits": "Feed SDI15 < 3.0; Max Feed Turbidity < 0.5 NTU",
        "Hydraulic Constraints": "Stage 1 Max Recovery 75%; High Pressure Stage 2 Max Recovery 70% (Total 93%)",
        "Biological Constraints": "Zero bio-film leak from UF; Log bio-count < 10 CFU/mL",
        "Equipment Constraints": "Max Operating Pressure: Stage 1 = 25 bar, Stage 2 = 65 bar",
        "Seasonal Constraints": "Hot weather increases membrane flux; adjust antiscalant dosage to prevent silica scaling."
    },
    {
        "Constraint Description": "Multiple Effect Evaporator (MEE) Thermal & COD Envelope",
        "Minimum Flow Rate": "3.0 m³/hr RO Reject",
        "Maximum Flow Rate": "8.5 m³/hr RO Reject",
        "Temperature Limits": "Boiling Temp 1st Effect 85°C - 90°C; 4th Effect 55°C - 60°C",
        "pH Limits": "7.0 - 8.5 (Prevent acid corrosion & alkaline scaling)",
        "Chemical Limits": "Feed COD < 300 mg/L (High COD causes severe boiling foam & condensate contamination)",
        "Loading Limits": "Max Feed TDS 100,000 mg/L; Discharge Slurry TDS 350,000 mg/L",
        "Hydraulic Constraints": "Falling film recirculation velocity > 1.8 m/s to prevent tube fouling",
        "Biological Constraints": "Zero live biological culture allowed in evaporator feed",
        "Equipment Constraints": "Steam Supply Pressure 2.5 - 4.0 bar; Vacuum in last effect 650-680 mmHg",
        "Seasonal Constraints": "High ambient humidity reduces cooling tower vacuum efficiency; lower steam rate."
    }
]

save_folder_data(
    "07_Process_Constraints",
    "Hydraulic, Thermal, Chemical, and Equipment Constraints for ETP & ZLD System Safety",
    f07_fields,
    f07_data
)

# ---------------------------------------------------------
# FOLDER 08: 08_Troubleshooting_and_Corrective_Actions
# ---------------------------------------------------------
f08_fields = {
    "Diagnostic Rules": ["Problem Name", "Symptoms", "Possible Causes", "Affected Parameters", "Corrective Actions", "Preventive Measures", "Emergency Actions"]
}
f08_data = [
    {
        "Problem Name": "Excessive White / Brown Foam in Aeration Basin",
        "Symptoms": "Thick foam layer covering aeration tank surface overflowing handrails.",
        "Possible Causes": "Un-degraded detergents/surfactants in raw dyeing effluent; low F/M ratio causing Nocardia filamentous growth.",
        "Affected Parameters": "DO (< 1.5 mg/L), MLSS (< 2500 mg/L), F/M ratio (< 0.10)",
        "Corrective Actions": "Spray water nozzles over aeration surface immediately to collapse foam. Dose food-grade silicone antifoam at 5-10 ppm.",
        "Preventive Measures": "Increase Waste Activated Sludge (WAS) rate to decrease sludge age; ensure equalization tank retains surfactant shock loads.",
        "Emergency Actions": "Dose 10 ppm silicone defoamer directly into aeration feed channel."
    },
    {
        "Problem Name": "Sludge Bulking / Poor Settling in Secondary Clarifier (SVI > 180 mL/g)",
        "Symptoms": "Bio-sludge floating on clarifier surface, high turbidity overflow, SVI > 180 mL/g.",
        "Possible Causes": "Prolonged low DO (< 1.0 mg/L), low pH (< 6.5), or nitrogen/phosphorus deficiency encouraging filamentous bacteria dominance.",
        "Affected Parameters": "SVI (> 180 mL/g), DO (< 1.0 mg/L), pH (< 6.5), Effluent TSS (> 80 mg/L)",
        "Corrective Actions": "Dose Hydrogen Peroxide (10-20 mg/L) or Sodium Hypochlorite (2-3 kg Chlorine/1000 kg MLSS) into RAS line to kill external filaments.",
        "Preventive Measures": "Increase aeration blower output to maintain DO > 2.5 mg/L; dose Urea/DAP to satisfy BOD:N:P = 100:5:1.",
        "Emergency Actions": "Dose 15 ppm H2O2 into RAS pipeline and bypass excess overflow to holding pond."
    },
    {
        "Problem Name": "Rapid Rise in RO Membrane Differential Pressure (ΔP > 2.5 bar)",
        "Symptoms": "RO differential pressure ΔP increases by > 15%, permeate flow drops by > 10%.",
        "Possible Causes": "Bio-fouling or organic fouling on RO membrane surface due to high SDI or bacterial leak from UF.",
        "Affected Parameters": "SDI15 (> 3.5), ΔP (> 2.5 bar), Permeate Flow (-12%)",
        "Corrective Actions": "Perform high-pH Clean-In-Place (CIP) with 0.1% NaOH + 0.1% EDTA solution at 35°C for 2 hours.",
        "Preventive Measures": "Replace UF module filters; increase SMBS dosing to ensure zero chlorine and sanitize feed lines weekly.",
        "Emergency Actions": "Isolate affected RO skid and switch to standby skid; initiate CIP cycle immediately."
    },
    {
        "Problem Name": "Scaling on RO High-Pressure Stage Membranes",
        "Symptoms": "Permeate TDS spikes (> 300 mg/L), high pressure pump pressure rises, recovery drops.",
        "Possible Causes": "Precipitation of Calcium Sulfate (CaSO4) or Silica due to depleted antiscalant dosing or exceeding recovery threshold.",
        "Affected Parameters": "Permeate TDS (> 300 mg/L), RO Recovery (> 92%), Antiscalant Dosing (< 2.0 ppm)",
        "Corrective Actions": "Perform low-pH Clean-In-Place (CIP) with 2% Citric Acid or 0.5% HCl solution for 3 hours.",
        "Preventive Measures": "Check antiscalant pump flow daily; restrict recovery rate to maximum design envelope based on projection software.",
        "Emergency Actions": "Lower RO recovery rate to 80% and flush skids with RO permeate."
    },
    {
        "Problem Name": "Severe Foaming and Boiling Instability in MEE Evaporator",
        "Symptoms": "Vapor condensate TDS spikes (> 500 mg/L), foam overflowing 1st effect sight glass.",
        "Possible Causes": "High residual COD / organic carryover in RO Reject feed entering evaporator.",
        "Affected Parameters": "Reject COD (> 1200 mg/L), Vapor Condensate TDS (> 500 mg/L)",
        "Corrective Actions": "Dose food-grade polyglycol defoamer directly into 1st effect MEE recirculation line. Lower steam supply pressure.",
        "Preventive Measures": "Ensure Fenton/Ozone tertiary treatment reduces RO Reject COD to < 300 mg/L before feed to MEE.",
        "Emergency Actions": "Reduce live steam pressure from 4.0 bar to 2.0 bar and injection of polyglycol defoamer."
    }
]

save_folder_data(
    "08_Troubleshooting_and_Corrective_Actions",
    "Operational Troubleshooting Matrix, Root Cause Analysis, and Corrective Action Protocols",
    f08_fields,
    f08_data
)

# ---------------------------------------------------------
# FOLDER 09: 09_Sludge_Management
# ---------------------------------------------------------
f09_fields = {
    "Sludge Management Details": ["Sludge Type", "Source Unit", "Characteristics", "Dewatering Method", "Disposal Method", "Reuse Options", "Storage Requirements", "Handling Procedures"]
}
f09_data = [
    {
        "Sludge Type": "Primary Chemical Sludge",
        "Source Unit": "Primary Coagulator & Tube Settler",
        "Characteristics": "High inorganic content (Alum/Lime/PAC hydroxides), dark color, high heavy metal content, solids conc 2-4%.",
        "Dewatering Method": "Filter Press / Decanter Centrifuge (dewatered to 30-35% dry solids cake)",
        "Disposal Method": "Disposal at Authorized Hazardous Waste TSDF (Treatment, Storage & Disposal Facility) Secured Landfill",
        "Reuse Options": "Co-processing in Cement Kilns (if heavy metals meet coprocessing criteria)",
        "Storage Requirements": "Covered concrete shed with leachate collection pit and impervious HDPE lining",
        "Handling Procedures": "Operators must wear rubber gloves, dust masks, and gumboots. Transport in closed containers with Form 10 Manifest."
    },
    {
        "Sludge Type": "Secondary Biological Sludge (Waste Activated Sludge - WAS)",
        "Source Unit": "Secondary Clarifier / Aeration Basin",
        "Characteristics": "Organic biomass sludge, rich in nitrogen & phosphorus, high moisture (98.5-99%), dark brown odor-free.",
        "Dewatering Method": "Sludge Drying Beds / Rotary Drum Thickener -> Filter Press (dewatered to 20-25% solids)",
        "Disposal Method": "Solar Sludge Drying -> Composting / Authorized TSDF incinerator",
        "Reuse Options": "Bio-fertilizer for non-food crops / Soil conditioner after heavy metal testing",
        "Storage Requirements": "Ventilated bio-sludge holding tank with coarse bubble aeration to prevent septic odor",
        "Handling Procedures": "Pump WAS daily based on MCRT (10-12 days); avoid septic stagnation in clarifier hoppers."
    },
    {
        "Sludge Type": "Fenton Chemical Sludge",
        "Source Unit": "Fenton Reaction Clarifier",
        "Characteristics": "Ferric Hydroxide Fe(OH)3 precipitate, dense red-brown color, acidic origin, solids conc 3-5%.",
        "Dewatering Method": "Recessed Plate High-Pressure Filter Press (dewatered to 35-40% solids)",
        "Disposal Method": "Hazardous Waste TSDF Landfill Disposal",
        "Reuse Options": "Inorganic pigment manufacturing / Iron recovery raw material",
        "Storage Requirements": "Dedicated Hazardous Waste Shed labeled as per CPCB Form 8",
        "Handling Procedures": "Neutralize sludge slurry to pH 7.5-8.0 prior to filter press pumping."
    },
    {
        "Sludge Type": "MEE / ATFD Crystallized Dry Salt",
        "Source Unit": "Agitated Thin Film Dryer (ATFD) & MEE Crystallizer",
        "Characteristics": "Dry crystalline salt powder (NaCl 70-80%, Na2SO4 15-25%), white/off-white powder, moisture < 2%, TDS 99.5%.",
        "Dewatering Method": "Thermal Drying via ATFD Steam Jacket (Moisture < 2%)",
        "Disposal Method": "Authorized TSDF Hazardous Landfill OR Marine Discharge (where permitted)",
        "Reuse Options": "Refined Salt Washing System for Textile Process Dyeing Bath Reuse",
        "Storage Requirements": "Dry moisture-proof sealed HDPE bags stored on wooden pallets in enclosed dry warehouse",
        "Handling Procedures": "Automatic bagging machine; operators wear N95 dust masks and eye goggles."
    }
]

save_folder_data(
    "09_Sludge_Management",
    "Comprehensive ETP Chemical, Biological, and Crystallized Salt Sludge Handling & Management",
    f09_fields,
    f09_data
)

# ---------------------------------------------------------
# FOLDER 10: 10_Water_Reuse_and_Recycling
# ---------------------------------------------------------
f10_fields = {
    "Recycling Applications": ["Reuse Application", "Required Water Quality", "Pretreatment Requirements", "Post-treatment Requirements", "Suitable Processes", "Unsuitable Processes", "Quality Monitoring Parameters"]
}
f10_data = [
    {
        "Reuse Application": "Dye House Wet Processing & Dye Bath Preparation",
        "Required Water Quality": "TDS < 100 mg/L, Hardness < 10 mg/L (as CaCO3), Colorless (< 5 PCU), COD = 0 mg/L, pH 6.5 - 7.2",
        "Pretreatment Requirements": "Full ETP Treatment -> UF -> 2-Stage High Recovery RO System",
        "Post-treatment Requirements": "RO Permeate pH conditioning (adjust to 6.8 with mild alkali if acidic)",
        "Suitable Processes": "Reactive Dyeing, Cotton Bleaching, Mercerizing, Scouring, Fabric Printing Paste Prep",
        "Unsuitable Processes": "None (RO Permeate is equal or superior to municipal raw water)",
        "Quality Monitoring Parameters": "Continuous Conductivity (EC), pH, Turbidity, Total Hardness"
    },
    {
        "Reuse Application": "Boiler Feed Water Makeup",
        "Required Water Quality": "TDS < 50 mg/L, Silica < 0.02 mg/L, Hardness = 0 mg/L, DO < 0.007 mg/L",
        "Pretreatment Requirements": "RO Permeate -> Mixed Bed Polisher / De-mineralization (DM) Plant",
        "Post-treatment Requirements": "Thermal De-aeration & Oxygen Scavenger (Hydrazine/Sulfite) Dosing",
        "Suitable Processes": "High-pressure Steam Boilers (15-40 bar)",
        "Unsuitable Processes": "Direct raw effluent feed",
        "Quality Monitoring Parameters": "Silica, Conductivity (< 5 µS/cm), Dissolved Oxygen, pH (8.5 - 9.2)"
    },
    {
        "Reuse Application": "Cooling Tower Basin Makeup",
        "Required Water Quality": "TDS < 500 mg/L, COD < 20 mg/L, TSS < 5 mg/L, Hardness < 100 mg/L",
        "Pretreatment Requirements": "UF Permeate or Partial RO Permeate Blend",
        "Post-treatment Requirements": "Dosing Bio-dispersant & Isothiazolinone Biocide to prevent Legionella",
        "Suitable Processes": "Equalization cooling tower, MEE condenser cooling circuit",
        "Unsuitable Processes": "Unfiltered biological clarifier effluent",
        "Quality Monitoring Parameters": "TDS, Langelier Saturation Index (LSI), Residual Biocide"
    },
    {
        "Reuse Application": "Machinery Washing, Floor Washing & Firefighting",
        "Required Water Quality": "TSS < 10 mg/L, BOD < 10 mg/L, COD < 50 mg/L, Odorless",
        "Pretreatment Requirements": "Tertiary Dual Media Filter (DMF) & Activated Carbon Filter (ACF)",
        "Post-treatment Requirements": "Sodium Hypochlorite chlorination (2.0 ppm free chlorine)",
        "Suitable Processes": "Screen washing, floor flushing, garden irrigation, fire water reservoir",
        "Unsuitable Processes": "Dye bath preparation, boiler feed",
        "Quality Monitoring Parameters": "TSS, Free Chlorine, Odor, E. coli Count"
    }
]

save_folder_data(
    "10_Water_Reuse_and_Recycling",
    "Water Recycling Standards, RO Permeate Reuse Applications, and Quality Criteria",
    f10_fields,
    f10_data,
    pdf_sources=["SOP for issuance of ZLD certificate.pdf"]
)

# ---------------------------------------------------------
# FOLDER 11: 11_Safety_and_Handling
# ---------------------------------------------------------
f11_fields = {
    "Safety & Handling Requirements": ["Protocol Name", "PPE Requirements", "Chemical Safety", "Equipment Safety", "Emergency Procedures", "Spill Response", "First Aid Measures", "Waste Handling Procedures"]
}
f11_data = [
    {
        "Protocol Name": "Concentrated Sulfuric Acid (H2SO4 98%) Safety Protocol",
        "PPE Requirements": "Acid-resistant neoprene suit, face shield, rubber aprons, heavy-duty butyl gloves, acid boots.",
        "Chemical Safety": "Exothermic reaction upon water contact. Always add ACID TO WATER slowly, NEVER water to acid.",
        "Equipment Safety": "Use double-walled PTFE/PVDF lined piping; pressure relief valve routed back to storage tank.",
        "Emergency Procedures": "Activate emergency eye-wash/shower station immediately. Sound chemical spill alarm.",
        "Spill Response": "Contain spill with dry sand/earth. Neutralize carefully with Hydrated Lime or Soda Ash before cleanup.",
        "First Aid Measures": "Eye contact: Flush with clean water for min 20 mins. Skin: Remove contaminated clothing and drench with water.",
        "Waste Handling Procedures": "Neutralized residue to be collected and pumped to primary equalization tank."
    },
    {
        "Protocol Name": "Hydrogen Peroxide (H2O2 35%) Handling Protocol",
        "PPE Requirements": "Chemical splash goggles, rubber gloves, Tyvek chemical suit, safety boots.",
        "Chemical Safety": "Strong oxidizer. Contact with combustibles (wood, paper, oil) may cause spontaneous fire. Keep vented.",
        "Equipment Safety": "SS316L or HDPE tanks with self-venting breather valves to prevent gas pressure build-up.",
        "Emergency Procedures": "Evacuate area if drum over-pressurizes. Dilute spill with massive volumes of water.",
        "Spill Response": "Flush spill area with copious amounts of water to dilute concentration below 1%. Do not use organic absorbents.",
        "First Aid Measures": "Inhalation: Move to fresh air. Skin/Eye: Rinse thoroughly with running water for 15 minutes.",
        "Waste Handling Procedures": "Dilute residual peroxide with water and quench with sodium bisulfite before disposal."
    },
    {
        "Protocol Name": "Enclosed Space & Deep Tank Entry (Equalization Basin / Sludge Pits)",
        "PPE Requirements": "Self-Contained Breathing Apparatus (SCBA), full-body safety harness with lifeline, gas detector.",
        "Chemical Safety": "Risk of toxic Hydrogen Sulfide (H2S), Carbon Monoxide (CO), and Oxygen Deficiency (< 19.5%).",
        "Equipment Safety": "Tri-pod retrieval hoist, explosion-proof forced air ventilation blower (min 10 air changes/hr).",
        "Emergency Procedures": "Standby rescue person at pit entrance. Never enter alone. Pull lifeline if worker collapses.",
        "Spill Response": "N/A (Gas / Enclosed Space Entry Hazard)",
        "First Aid Measures": "Move unconscious worker to fresh air immediately. Administer CPR / Oxygen therapy and call medical emergency.",
        "Waste Handling Procedures": "Pump out accumulated sludge completely before worker tank entry."
    },
    {
        "Protocol Name": "High Pressure RO Line & System Mechanical Safety",
        "PPE Requirements": "Safety glasses, ear protection (muffs), steel-toe work boots, high-grip gloves.",
        "Chemical Safety": "Chemical cleaning agents (NaOH, Citric Acid) used during CIP cycles.",
        "Equipment Safety": "High pressure interlock switches (set at max 25 bar Stage 1, 65 bar Stage 2); pressure relief valves.",
        "Emergency Procedures": "Hit Emergency Stop (E-Stop) button on RO control panel to de-energize high pressure pump instantly.",
        "Spill Response": "Contain CIP chemical leaks with containment bunds.",
        "First Aid Measures": "High pressure water jet strike: Seek immediate medical attention for subcutaneous tissue injury.",
        "Waste Handling Procedures": "Neutralize acidic/alkaline CIP waste before discharging to equalization basin."
    }
]

save_folder_data(
    "11_Safety_and_Handling",
    "ETP Chemical Safety Protocols, PPE Standards, Emergency Procedures, and Spill Response",
    f11_fields,
    f11_data
)

# ---------------------------------------------------------
# FOLDER 12: 12_Best_Practices
# ---------------------------------------------------------
f12_fields = {
    "Best Practices": ["Practice Category", "Operational Best Practices", "Chemical Optimization Practices", "Energy Saving Practices", "Water Saving Practices", "Sludge Reduction Practices", "Preventive Maintenance Practices", "Process Optimization Techniques"]
}
f12_data = [
    {
        "Practice Category": "Physico-Chemical Coagulation Optimization",
        "Operational Best Practices": "Perform Jar Tests every 4 hours or whenever dye batch house discharge color changes.",
        "Chemical Optimization Practices": "Switch from conventional Alum to Poly Aluminum Chloride (PAC) to reduce chemical sludge volume by 35%.",
        "Energy Saving Practices": "Use high-efficiency flash mixer impellers operated via VFD timer control.",
        "Water Saving Practices": "Prepare chemical dosing stock solutions using RO Permeate instead of fresh groundwater.",
        "Sludge Reduction Practices": "Optimize polyelectrolyte dosing (0.5-1.0 ppm) to produce dense flocs and reduce primary sludge mass.",
        "Preventive Maintenance Practices": "Calibrate chemical dosing pump stroke length weekly; inspect diaphragm valves.",
        "Process Optimization Techniques": "Automate acid/alkali dosing using dual-redundant inline pH sensors with PID feedback controller."
    },
    {
        "Practice Category": "Aerobic Biological System Optimization",
        "Operational Best Practices": "Maintain aeration basin Dissolved Oxygen (DO) strictly between 2.0 and 3.0 mg/L continuously.",
        "Chemical Optimization Practices": "Calculate exact nutrient dosing (BOD:N:P = 100:5:1) daily based on influent composite BOD analysis.",
        "Energy Saving Practices": "Install Variable Frequency Drives (VFD) on Roots Air Blowers interlocked to real-time DO sensor probes.",
        "Water Saving Practices": "Recycle 75% of secondary clarifier bio-sludge (RAS) to maintain MLSS at target 3,800 mg/L.",
        "Sludge Reduction Practices": "Maintain optimum Mean Cell Residence Time (MCRT / Sludge Age) at 10-12 days to minimize excess WAS production.",
        "Preventive Maintenance Practices": "Perform air diffuser purge and acid wash every 6 months to prevent bubble clogging.",
        "Process Optimization Techniques": "Monitor Sludge Volume Index (SVI) daily; target SVI range 80 - 120 mL/g to prevent bio-bulking."
    },
    {
        "Practice Category": "Membrane (UF & RO) & ZLD Evaporator Best Practices",
        "Operational Best Practices": "Log Silt Density Index (SDI15) every 4 hours; ensure SDI15 < 3.0 before feeding RO skids.",
        "Chemical Optimization Practices": "Use projection software to optimize polycarboxylate antiscalant dosage to prevent silica/calcium scale.",
        "Energy Saving Practices": "Install Energy Recovery Devices (ERD / Isobaric Pressure Exchangers) on High-Pressure RO skids to save 40-50% power.",
        "Water Saving Practices": "Implement 2-Stage RO configuration with DTRO (Disc Tube RO) to boost total water recovery to 93-95%.",
        "Sludge Reduction Practices": "Operate MEE falling film effects under optimum vacuum (650-680 mmHg) to produce dry reusable salt crystals via ATFD.",
        "Preventive Maintenance Practices": "Initiate automated Clean-In-Place (CIP) whenever normalized permeate flow drops by 10% or ΔP increases by 15%.",
        "Process Optimization Techniques": "Interlock RO High Pressure Pumps with ORP sensor (< 200 mV) to completely eliminate chlorine membrane burn risk."
    }
]

save_folder_data(
    "12_Best_Practices",
    "Operational, Chemical, Energy, Water, and Maintenance Best Practices for ETP & ZLD Plants",
    f12_fields,
    f12_data,
    pdf_sources=["Technical Workshop on Operation & Management of CETP.pdf", "Performance evaluation of effluent treatment plant.pdf"]
)

print("ALL 12 ETP FOLDERS SUCCESSFULLY POPULATED!")
