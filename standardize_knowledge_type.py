import json
import os
import re
from collections import Counter

# Canonical knowledge types (lower case, underscores)
CANONICAL_TYPES = {
    "fact",
    "compatibility",
    "range",
    "formula",
    "relationship",
    "recipe",
    "constraint",
    "process_step",
    "experimental_result",
    "recommendation",
    "exception"
}

def normalize_type(t):
    if not isinstance(t, str):
        return None
    # Convert to lower case
    t = t.strip().lower()
    # Replace spaces and hyphens with underscores
    t = re.sub(r'[\s\-]+', '_', t)
    return t

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath, indent=2):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)

def main():
    kb_path = os.path.join("mater_knowledge_base", "master_knowledge_base.json")
    report_path = os.path.join("mater_knowledge_base", "knowledge_type_standardization_report.json")
    validation_report_path = os.path.join("mater_knowledge_base", "kb_validation_report.json")
    
    print("Loading master knowledge base...")
    data = load_json(kb_path)
    if 'knowledge_records' not in data:
        print("Error: No knowledge_records found")
        return
    
    records = data['knowledge_records']
    total_records = len(records)
    
    # Collect original types
    original_types = []
    for rec in records:
        kt = rec.get('knowledge_type')
        original_types.append(kt if kt is not None else None)
    
    original_counter = Counter(original_types)
    
    # Track changes
    changes = []
    standardized_counter = Counter()
    manual_review_needed = []
    
    for idx, rec in enumerate(records):
        kid = rec.get('knowledge_id', f'unknown_{idx}')
        original_kt = rec.get('knowledge_type')
        normalized = normalize_type(original_kt)
        
        if normalized is None:
            # None or non-string, treat as missing? We'll keep as is and flag for manual review?
            # According to task, we should not guess. We'll add to manual review.
            manual_review_needed.append({
                "record_index": idx,
                "knowledge_id": kid,
                "original_knowledge_type": original_kt,
                "issue": "knowledge_type is null or non-string"
            })
            standardized_counter[None] += 1
            changes.append(False)
            continue
        
        if normalized in CANONICAL_TYPES:
            # Map to canonical type (use the normalized version which is canonical)
            if original_kt != normalized:
                rec['knowledge_type'] = normalized
                changes.append(True)
                # Also keep original? The task says if we need to mark for manual review we preserve original in separate field.
                # But if we are mapping to canonical, we don't need to keep original unless we want to track.
                # We'll not add original_knowledge_type field for successful mappings.
            else:
                changes.append(False)
            standardized_counter[normalized] += 1
        else:
            # Not in canonical after normalization -> needs manual review
            manual_review_needed.append({
                "record_index": idx,
                "knowledge_id": kid,
                "original_knowledge_type": original_kt,
                "normalized_type": normalized,
                "issue": "Normalized type not in canonical list"
            })
            # Keep original type unchanged
            standardized_counter[original_kt] += 1
            changes.append(False)
    
    # Count changes
    num_changed = sum(changes)
    num_manual = len(manual_review_needed)
    
    # Create report
    report = {
        "knowledge_type_standardization_report": {
            "total_records": total_records,
            "original_knowledge_type_counts": dict(original_counter),
            "standardized_knowledge_type_counts": dict(standardized_counter),
            "records_changed": num_changed,
            "records_requiring_manual_review": num_manual,
            "manual_review_entries": manual_review_needed,
            "canonical_types": list(CANONICAL_TYPES),
            "mapping_note": "Types were normalized by lowercasing and replacing spaces/hyphens with underscores. If normalized type matched a canonical type, it was mapped to that canonical type."
        }
    }
    
    # Save updated master knowledge base
    save_json(data, kb_path)
    print(f"Updated master knowledge base saved to {kb_path}")
    
    # Save report
    save_json(report, report_path)
    print(f"Standardization report saved to {report_path}")
    
    # Print summary
    print("\n=== Summary ===")
    print(f"Total records processed: {total_records}")
    print(f"Records whose type was standardized: {num_changed}")
    print(f"Records requiring manual review: {num_manual}")
    print(f"Original knowledge_type distribution: {dict(original_counter)}")
    print(f"Standardized knowledge_type distribution: {dict(standardized_counter)}")
    
    # Now re-run validation (we can call our validation script, but we'll just update the validation report by running the validation again)
    # We'll import the validation function from validate_kb.py? Instead, we'll run the validation script as a subprocess.
    # But we can also just update the validation report by reusing the validation logic.
    # For simplicity, we'll run the validation script again.
    print("\nRe-running knowledge base validation...")
    os.system("python validate_kb.py")
    
if __name__ == "__main__":
    main()
