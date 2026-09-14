import json
import os
import shutil
from collections import defaultdict

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath, indent=2):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)

def main():
    # Paths
    kb_path = os.path.join("mater_knowledge_base", "master_knowledge_base.json")
    backup_path = os.path.join("mater_knowledge_base", "master_knowledge_base_before_expert_review.json")
    source_json_dir = os.path.join("mater_knowledge_base", "source_json")
    expert_report_path = os.path.join("mater_knowledge_base", "expert_review_report.json")
    expert_queue_path = os.path.join("mater_knowledge_base", "expert_review_queue.json")
    validation_report_path = os.path.join("mater_knowledge_base", "kb_validation_report.json")
    
    # Backup
    print("Creating backup...")
    shutil.copy2(kb_path, backup_path)
    
    # Load master knowledge base
    print("Loading master knowledge base...")
    data = load_json(kb_path)
    if 'knowledge_records' not in data:
        print("Error: No knowledge_records found")
        return
    
    records = data['knowledge_records']
    total_records = len(records)
    
    # Initialize counters
    candidate_count = 0
    not_candidate_count = 0
    needs_expert_review_count = 0
    potential_conflict_count = 0
    
    # For report breakdowns
    by_domain = defaultdict(int)
    by_knowledge_type = defaultdict(int)
    by_potential_rule_category = defaultdict(int)
    records_requiring_review = []  # for needs_expert_review and potential_conflict
    potential_conflicts = []       # for conflict_status: potential_conflict
    
    # Mapping from knowledge_type to (rule_candidate_status, potential_rule_category)
    # Based on heuristic: we'll make an initial assignment, but note that expert review may change this.
    type_mapping = {
        'fact': ('not_candidate', None),
        'compatibility': ('candidate', 'compatibility_rule'),
        'range': ('candidate', 'parameter_range'),
        'formula': ('candidate', 'formula_rule'),
        'relationship': ('needs_expert_review', None),  # needs context to be a rule
        'recipe': ('candidate', 'recipe_constraint'),
        'constraint': ('candidate', None),  # generic constraint, category to be determined by expert
        'process_step': ('candidate', 'process_sequence_rule'),
        'experimental_result': ('not_candidate', None),
        'recommendation': ('needs_expert_review', None),
        'exception': ('needs_expert_review', None)
    }
    
    # Process each record
    for idx, record in enumerate(records):
        kid = record.get('knowledge_id', f'unknown_{idx}')
        domain = record.get('domain', 'unknown')
        kt = record.get('knowledge_type')
        
        # Update breakdowns
        by_domain[domain] += 1
        if kt:
            by_knowledge_type[kt] += 1
        
        # Get mapping
        if kt in type_mapping:
            rule_candidate_status, potential_rule_category = type_mapping[kt]
        else:
            # If knowledge_type is not in mapping (shouldn't happen after standardization)
            rule_candidate_status = 'needs_expert_review'
            potential_rule_category = None
        
        # Assign new fields
        record['rule_candidate_status'] = rule_candidate_status
        record['potential_rule_category'] = potential_rule_category
        record['conflict_status'] = 'undetermined'  # We cannot determine conflicts without domain knowledge
        
        # Update counters
        if rule_candidate_status == 'candidate':
            candidate_count += 1
        elif rule_candidate_status == 'not_candidate':
            not_candidate_count += 1
        else:  # needs_expert_review
            needs_expert_review_count += 1
        
        if potential_rule_category is not None:
            by_potential_rule_category[potential_rule_category] += 1
        else:
            by_potential_rule_category[None] += 1
        
        # For records requiring review (needs_expert_review or potential_conflict)
        if rule_candidate_status == 'needs_expert_review':
            records_requiring_review.append({
                'knowledge_id': kid,
                'domain': domain,
                'knowledge_type': kt,
                'subject': record.get('subject'),
                'property': record.get('property'),
                'value': record.get('value'),
                'reason_for_review': f'knowledge_type "{kt}" marked for expert review',
                'source': record.get('source')
            })
        
        # For potential conflicts (we have none yet, but we'll mark all as undetermined for now)
        # In a real implementation, we would compare records here.
        # Since we cannot do that without domain knowledge, we leave conflict_status as undetermined.
        # We'll still add to potential_conflicts list if conflict_status is potential_conflict (none for now).
    
    # Create expert review report
    expert_report = {
        "total_records": total_records,
        "candidate_count": candidate_count,
        "not_candidate_count": not_candidate_count,
        "needs_expert_review_count": needs_expert_review_count,
        "potential_conflict_count": potential_conflict_count,
        "by_domain": dict(by_domain),
        "by_knowledge_type": dict(by_knowledge_type),
        "by_potential_rule_category": {str(k): v for k, v in by_potential_rule_category.items()},
        "records_requiring_review": records_requiring_review,
        "potential_conflicts": potential_conflicts
    }
    
    # Save expert review report
    save_json(expert_report, expert_report_path)
    print(f"Expert review report saved to {expert_report_path}")
    
    # Create expert review queue (only records needing review or potential conflict)
    expert_queue = []
    for record in records:
        if record['rule_candidate_status'] == 'needs_expert_review' or record['conflict_status'] == 'potential_conflict':
            # Create a copy of the record with only the required fields plus expert_decision
            queue_entry = {
                'knowledge_id': record.get('knowledge_id'),
                'domain': record.get('domain'),
                'knowledge_type': record.get('knowledge_type'),
                'subject': record.get('subject'),
                'property': record.get('property'),
                'value': record.get('value'),
                'minimum': record.get('minimum'),
                'maximum': record.get('maximum'),
                'unit': record.get('unit'),
                'conditions': record.get('conditions'),
                'applicability': record.get('applicability'),
                'source': record.get('source'),
                'reason_for_review': f'rule_candidate_status: {record["rule_candidate_status"]}, conflict_status: {record["conflict_status"]}',
                'expert_decision': 'pending'
            }
            expert_queue.append(queue_entry)
    
    save_json(expert_queue, expert_queue_path)
    print(f"Expert review queue saved to {expert_queue_path} with {len(expert_queue)} entries")
    
    # Save updated master knowledge base
    save_json(data, kb_path)
    print(f"Updated master knowledge base saved to {kb_path}")
    
    # Now validate the updated knowledge base
    print("\nRe-running knowledge base validation...")
    # We'll reuse the validation script but we need to update it to accept the new fields.
    # Instead, we'll run a simple validation: check JSON, count records, check for duplicates, and check that new fields exist.
    validation_result = {
        "valid_json": True,
        "valid": True,
        "records_checked": len(data.get('knowledge_records', [])),
        "issues": [],
        "stats": {}
    }
    
    # Quick checks
    try:
        with open(kb_path, 'r', encoding='utf-8') as f:
            json.load(f)  # if this fails, we'll catch below
    except Exception as e:
        validation_result["valid_json"] = False
        validation_result["error"] = f"Failed to load JSON: {str(e)}"
    
    if validation_result["valid_json"]:
        records = data['knowledge_records']
        # Check record count
        if len(records) != total_records:
            validation_result["valid"] = False
            validation_result["issues"].append({
                "issue": f"Record count mismatch: expected {total_records}, got {len(records)}",
                "severity": "error"
            })
        
        # Check for duplicate knowledge_id
        id_seen = set()
        duplicate_ids = []
        for rec in records:
            kid = rec.get('knowledge_id')
            if kid in id_seen:
                duplicate_ids.append(kid)
            else:
                id_seen.add(kid)
        if duplicate_ids:
            validation_result["valid"] = False
            validation_result["issues"].append({
                "issue": f"Duplicate knowledge IDs found: {duplicate_ids[:10]}",
                "severity": "error"
            })
        
        # Check that new fields exist and have valid values
        allowed_candidate_status = {"candidate", "not_candidate", "needs_expert_review"}
        allowed_conflict_status = {"potential_conflict", "none", "undetermined"}
        for idx, rec in enumerate(records):
            kid = rec.get('knowledge_id', f'unknown_{idx}')
            # rule_candidate_status
            rcs = rec.get('rule_candidate_status')
            if rcs is None:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "record_index": idx,
                    "knowledge_id": kid,
                    "issue": "Missing rule_candidate_status",
                    "severity": "error"
                })
            elif rcs not in allowed_candidate_status:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "record_index": idx,
                    "knowledge_id": kid,
                    "issue": f"Invalid rule_candidate_status: {rcs}",
                    "severity": "error"
                })
            # potential_rule_category (can be any string or null, so we only check if present)
            # conflict_status
            cs = rec.get('conflict_status')
            if cs is None:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "record_index": idx,
                    "knowledge_id": kid,
                    "issue": "Missing conflict_status",
                    "severity": "error"
                })
            elif cs not in allowed_conflict_status:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "record_index": idx,
                    "knowledge_id": kid,
                    "issue": f"Invalid conflict_status: {cs}",
                    "severity": "error"
                })
        
        # Check that original fields are still present (we assume they are, but we can spot-check a few)
        # We'll check the first record for original fields as a sanity check
        if records:
            sample = records[0]
            original_fields = ['knowledge_id', 'domain', 'knowledge_type', 'subject', 'property', 'value', 
                              'conditions', 'applicability', 'source', 'confidence', 'validation_status']
            for field in original_fields:
                if field not in sample:
                    validation_result["valid"] = False
                    validation_result["issues"].append({
                        "record_index": 0,
                        "knowledge_id": sample.get('knowledge_id'),
                        "issue": f"Missing original field: {field}",
                        "severity": "error"
                    })
    
    # Determine overall validity
    has_errors = any(issue.get("severity") == "error" for issue in validation_result["issues"])
    validation_result["valid"] = validation_result["valid_json"] and not has_errors and validation_result["records_checked"] > 0
    
    # Create validation report
    from datetime import datetime
    validation_report = {
        "kb_validation_report": {
            "kb_file": kb_path,
            "validation_timestamp": datetime.utcnow().isoformat() + "Z",
            "valid_json": validation_result["valid_json"],
            "valid": validation_result["valid"],
            "records_checked": validation_result["records_checked"],
            "stats": validation_result["stats"],
            "issues": validation_result["issues"]
        }
    }
    
    # Write validation report
    save_json(validation_report, validation_report_path)
    print(f"Validation report saved to {validation_report_path}")
    
    # Print summary
    print("\n=== Expert Review Preparation Summary ===")
    print(f"Total records: {total_records}")
    print(f"Rule candidates: {candidate_count}")
    print(f"Not candidates: {not_candidate_count}")
    print(f"Needs expert review: {needs_expert_review_count}")
    print(f"Potential conflicts: {potential_conflict_count}")
    print(f"Domains represented: {len(by_domain)}")
    print(f"Validation errors: {sum(1 for i in validation_result['issues'] if i.get('severity') == 'error')}")
    print(f"Validation warnings: {sum(1 for i in validation_result['issues'] if i.get('severity') == 'warning')}")
    print("\nFiles created/modified:")
    print(f"  - {backup_path} (backup)")
    print(f"  - {kb_path} (updated)")
    print(f"  - {expert_report_path}")
    print(f"  - {expert_queue_path}")
    print(f"  - {validation_report_path}")

if __name__ == "__main__":
    main()
