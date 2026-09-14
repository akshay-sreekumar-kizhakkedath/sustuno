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

# 1. Copy raw source files to 00_Raw_Source_Data
raw_target = os.path.join(base_target, "00_Raw_Source_Data")

for root_dir in [src_root, src_cpcb, src_data]:
    if os.path.exists(root_dir):
        for item in os.listdir(root_dir):
            s_path = os.path.join(root_dir, item)
            if os.path.isfile(s_path):
                shutil.copy2(s_path, os.path.join(raw_target, item))

# Helper to write json, csv, and readme
def save_folder_data(folder_name, title, fields_description, data_list):
    folder_path = os.path.join(base_target, folder_name)
    
    # Save JSON
    json_path = os.path.join(folder_path, "data.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({"title": title, "collected_data": data_list}, f, indent=2)
        
    # Save CSV
    csv_path = os.path.join(folder_path, "data.csv")
    if data_list and isinstance(data_list, list) and len(data_list) > 0:
        # collect all keys
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
                
    # Save README.md
    readme_path = os.path.join(folder_path, "README.md")
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(f"# {folder_name.replace('_', ' ')}\n\n")
        f.write(f"## Category Overview\n{title}\n\n")
        f.write("## Data Schema & Collected Fields\n")
        for section, field_list in fields_description.items():
            f.write(f"### {section}\n")
            for field in field_list:
                f.write(f"- `{field}`\n")
            f.write("\n")
        f.write("## Data Summary\n")
        f.write(f"Total Records: {len(data_list)}\n\n")
        f.write("Files in this directory:\n")
        f.write("- `data.json`: Complete structured data in JSON format\n")
        f.write("- `data.csv`: Tabular data export\n")
        f.write("- `README.md`: Field specifications and summary documentation\n")

print("Base setup completed.")
