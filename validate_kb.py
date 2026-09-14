import json
import os
import sys
from collections import defaultdict
from datetime import datetime

def load_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def validate_knowledge_base(kb_file):
    """
    Validate the knowledge base JSON file.
    Expected structure: 
    {
        "knowledge_records": [ ... ]
    }
    Each record should have:
        knowledge_id, domain, knowledge_type, subject, property, value, 
        conditions, applicability, source, confidence, validation_status
    """
    try:
        data = load_json_file(kb_file)
    except Exception as e:
        return {
            "valid_json": False,
            "error": f"Failed to load JSON: {str(e)}",
            "records_checked": 0,
            "issues": [],
            "stats": {}
        }
    
    if 'knowledge_records' not in data:
        return {
            "valid_json": True,
            "error": "Missing 'knowledge_records' key",
            "records_checked": 0,
            "issues": [],
            "stats": {}
        }
    
    records = data['knowledge_records']
    total_records = len(records)
    
    # Define required fields
    required_fields = [
        'knowledge_id', 'domain', 'knowledge_type', 'subject', 
        'property', 'value', 'conditions', 'applicability', 
        'source', 'confidence', 'validation_status'
    ]
    
    # Define allowed knowledge types (we can extend this)
    allowed_knowledge_types = {
        'fact', 'compatibility', 'range', 'formula', 'relationship', 'recipe', 'constraint', 'process_step', 'experimental_result', 'recommendation', 'exception'
    }
    
    issues = []
    id_seen = set()
    duplicate_ids = []
    
    for idx, record in enumerate(records):
        # Check for duplicate knowledge_id
        kid = record.get('knowledge_id')
        if kid in id_seen:
            duplicate_ids.append(kid)
        else:
            id_seen.add(kid)
        
        # Check required fields
        for field in required_fields:
            if field not in record:
                issues.append({
                    "record_index": idx,
                    "knowledge_id": kid if kid else f"unknown_{idx}",
                    "issue": f"Missing required field: {field}",
                    "severity": "error"
                })
        
        # Check knowledge_type if present
        kt = record.get('knowledge_type')
        if kt and kt not in allowed_knowledge_types:
            issues.append({
                "record_index": idx,
                "knowledge_id": kid if kid else f"unknown_{idx}",
                "issue": f"Invalid knowledge_type: {kt}. Allowed: {', '.join(sorted(allowed_knowledge_types))}",
                "severity": "warning"
            })
        
        # Check source information
        source = record.get('source')
        if source and isinstance(source, dict):
            if 'file_name' not in source or not source['file_name']:
                issues.append({
                    "record_index": idx,
                    "knowledge_id": kid if kid else f"unknown_{idx}",
                    "issue": "Source information missing file_name",
                    "severity": "warning"
                })
        elif source is not None:
            issues.append({
                "record_index": idx,
                "knowledge_id": kid if kid else f"unknown_{idx}",
                "issue": "Source is not an object",
                "severity": "error"
            })
        
        # Check unit (if present, should be string)
        unit = record.get('unit')
        if unit is not None and not isinstance(unit, str):
            issues.append({
                "record_index": idx,
                "knowledge_id": kid if kid else f"unknown_{idx}",
                "issue": f"Unit should be a string, got {type(unit).__name__}",
                "severity": "warning"
            })
    
    # Prepare stats
    stats = {
        "total_records": total_records,
        "unique_ids": len(id_seen),
        "duplicate_ids": len(duplicate_ids),
        "duplicate_id_list": duplicate_ids[:10]  # limit to first 10
    }
    
    # Determine overall validity
    has_errors = any(issue["severity"] == "error" for issue in issues)
    valid = not has_errors and total_records > 0
    
    return {
        "valid_json": True,
        "valid": valid,
        "records_checked": total_records,
        "issues": issues,
        "stats": stats
    }

def main():
    kb_file = os.path.join("mater_knowledge_base", "master_knowledge_base.json")
    if not os.path.exists(kb_file):
        print(f"Error: File not found: {kb_file}")
        sys.exit(1)
    
    result = validate_knowledge_base(kb_file)
    
    # Create validation report
    report = {
        "kb_validation_report": {
            "kb_file": kb_file,
            "validation_timestamp": datetime.utcnow().isoformat() + "Z",
            "valid_json": result["valid_json"],
            "valid": result.get("valid", False),
            "records_checked": result["records_checked"],
            "stats": result["stats"],
            "issues": result["issues"]
        }
    }
    
    # Write report to file
    report_file = os.path.join("mater_knowledge_base", "kb_validation_report.json")
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"Validation complete. Report saved to: {report_file}")
    print(f"Records checked: {result['records_checked']}")
    print(f"Valid: {result.get('valid', False)}")
    if result["stats"]["duplicate_ids"] > 0:
        print(f"Duplicate IDs found: {result['stats']['duplicate_ids']}")
    if result["issues"]:
        error_count = sum(1 for i in result["issues"] if i["severity"] == "error")
        warning_count = sum(1 for i in result["issues"] if i["severity"] == "warning")
        print(f"Issues: {error_count} errors, {warning_count} warnings")

if __name__ == "__main__":
    main()


