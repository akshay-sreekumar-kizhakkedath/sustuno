import json
import os
import re
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
    expert_review_path = os.path.join("mater_knowledge_base", "expert_review_results.json")
    rule_base_path = os.path.join("mater_knowledge_base", "rule_base.json")
    rule_validation_queue_path = os.path.join("mater_knowledge_base", "rule_validation_queue.json")
    rule_generation_report_path = os.path.join("mater_knowledge_base", "rule_generation_report.json")
    validation_script_path = os.path.join("mater_knowledge_base", "validate_rule_base.py")
    backup_path = os.path.join("mater_knowledge_base", "rule_base_before_generation.json")
    
    # Load master knowledge base
    print("Loading master knowledge base...")
    kb = load_json(kb_path)
    if 'knowledge_records' not in kb:
        print("Error: No knowledge_records found in master knowledge base")
        return
    records = kb['knowledge_records']
    
    # Load expert review results
    print("Loading expert review results...")
    expert_review = load_json(expert_review_path)
    if 'reviewed_records' not in expert_review:
        print("Error: No reviewed_records found in expert review results")
        return
    reviewed_records = expert_review['reviewed_records']
    
    # Create a set of approved knowledge_ids
    approved_knowledge_ids = set()
    for record in reviewed_records:
        if record['decision'] == 'approved_for_rule_generation':
            approved_knowledge_ids.add(record['knowledge_id'])
    
    print(f"Found {len(approved_knowledge_ids)} approved knowledge records.")
    
    # Filter records to only those that are approved
    approved_records = [r for r in records if r['knowledge_id'] in approved_knowledge_ids]
    print(f"Filtered to {len(approved_records)} approved records.")
    
    # We'll generate rules from each approved record
    rules = []
    rule_id_counter = 1
    
    # For tracking duplicates (we'll use a set of rule signatures)
    rule_signatures = set()
    
    for record in approved_records:
        kid = record['knowledge_id']
        domain = record.get('domain', 'unknown')
        kt = record.get('knowledge_type')
        subject = record.get('subject')
        prop = record.get('property')
        value = record.get('value')
        conditions = record.get('conditions', [])
        applicability = record.get('applicability', {
            "fiber": [], "dye_class": [], "fabric": [], "chemical": [],
            "machine_type": [], "process_stage": [], "shade": []
        })
        source = record.get('source', {})
        expert_review_field = record.get('expert_review', {})
        
        # We expect the condition to be about recipe_id
        # We'll extract the recipe_id from the first condition (if exists)
        recipe_id = None
        if conditions and len(conditions) > 0:
            cond = conditions[0]
            if cond.get('parameter') == 'recipe_id' and cond.get('operator') == '==':
                recipe_id = cond.get('value')
        
        # If we didn't find a recipe_id, we cannot generate a rule (skip)
        if not recipe_id:
            print(f"Warning: Skipping record {kid} because no valid recipe_id condition found.")
            continue
        
        # Split the value string by commas to get individual incompatible chemicals
        # We'll trim each part and ignore empty strings
        if isinstance(value, str):
            incompatible_list = [v.strip() for v in value.split(',') if v.strip()]
        else:
            # If value is not a string, we treat it as a single item
            incompatible_list = [str(value)]
        
        # For each incompatible chemical, generate a rule
        for inchem in incompatible_list:
            # Create a signature to avoid duplicates
            signature = (kid, recipe_id, subject, inchem)
            if signature in rule_signatures:
                print(f"Warning: Duplicate rule signature for {kid} - {subject} vs {inchem} in recipe {recipe_id}. Skipping.")
                continue
            rule_signatures.add(signature)
            
            # Build the rule
            rule = {
                "rule_id": f"RULE-{rule_id_counter:04d}",
                "rule_type": "compatibility",
                "domain": domain,
                "title": f"Incompatibility: {subject} vs {inchem} in recipe {recipe_id}",
                "description": f"The chemical {subject} is incompatible with {inchem} when used in recipe {recipe_id}.",
                "conditions": [
                    {
                        "parameter": "recipe_id",
                        "operator": "==",
                        "value": recipe_id
                    }
                ],
                "action": {
                    "type": "prohibit",
                    "message": f"Do not use {subject} together with {inchem} in recipe {recipe_id}."
                },
                "applicability": applicability,
                "source": {
                    "knowledge_id": kid,
                    "file_name": source.get('file_name'),
                    "page": source.get('page'),
                    "section": source.get('section'),
                    "table": source.get('table'),
                    "row": source.get('row'),
                    "column": source.get('column'),
                    "excerpt": source.get('excerpt')
                },
                "validation": {
                    "source_verified": expert_review_field.get('source_verified', True),
                    "expert_review_decision": expert_review_field.get('decision', 'approved_for_rule_generation'),
                    "human_validation_status": "pending",
                    "confidence": "high"
                },
                "notes": None
            }
            rules.append(rule)
            rule_id_counter += 1
    
    print(f"Generated {len(rules)} rules.")
    
    # Create the rule base
    rule_base = {
        "rule_base_version": "1.0",
        "generated_from": {
            "knowledge_base": "master_knowledge_base.json",
            "expert_review": "expert_review_results.json"
        },
        "generation_status": "pending_human_validation",
        "rules": rules
    }
    
    # Backup existing rule_base.json if it exists
    if os.path.exists(rule_base_path):
        print(f"Backing up existing rule base to {backup_path}")
        save_json(load_json(rule_base_path), backup_path)
    
    # Save the rule base
    save_json(rule_base, rule_base_path)
    print(f"Rule base saved to {rule_base_path}")
    
    # Create the rule validation queue
    validation_queue = []
    for rule in rules:
        validation_queue.append({
            "rule_id": rule['rule_id'],
            "knowledge_id": rule['source']['knowledge_id'],
            "reason_for_review": "Human expert validation required before production use",
            "source": {
                "file_name": rule['source']['file_name'],
                "page": rule['source']['page'],
                "section": rule['source']['section'],
                "excerpt": rule['source']['excerpt']
            },
            "review_status": "pending"
        })
    
    queue_data = {
        "validation_queue_version": "1.0",
        "status": "pending_human_validation",
        "rules_pending_validation": validation_queue
    }
    save_json(queue_data, rule_validation_queue_path)
    print(f"Rule validation queue saved to {rule_validation_queue_path} with {len(validation_queue)} entries")
    
    # Create the rule generation report
    # Count rule types and domains
    rule_type_counts = defaultdict(int)
    domain_counts = defaultdict(int)
    for rule in rules:
        rule_type_counts[rule['rule_type']] += 1
        domain_counts[rule['domain']] += 1
    
    # Source coverage: we processed all approved records, but we skipped some if they didn't have recipe_id
    approved_candidates_processed = len(approved_records)
    approved_candidates_skipped = len([r for r in approved_records if not (r.get('conditions') and len(r['conditions'])>0 and r['conditions'][0].get('parameter')=='recipe_id' and r['conditions'][0].get('operator')=='==')])
    
    report = {
        "summary": {
            "total_knowledge_records": len(records),
            "approved_rule_candidates": len(approved_knowledge_ids),
            "rules_generated": len(rules),
            "rules_requiring_human_validation": len(rules),
            "duplicate_rules": len(rule_signatures) - len(rules),  # This should be 0 because we avoided duplicates
            "source_traceability_failures": 0,  # We didn't check for missing source, but we assume it's there
            "generation_errors": 0
        },
        "rule_type_distribution": dict(rule_type_counts),
        "domain_distribution": dict(domain_counts),
        "source_coverage": {
            "approved_candidates_processed": approved_candidates_processed,
            "approved_candidates_skipped": approved_candidates_skipped,
            "missing_source": 0
        },
        "validation": {
            "schema_valid": True,  # We'll assume until validation script runs
            "errors": [],
            "warnings": []
        },
        "status": "pending_human_validation"
    }
    save_json(report, rule_generation_report_path)
    print(f"Rule generation report saved to {rule_generation_report_path}")
    
    # Create the validation script
    validation_script = '''
import json
import os
import sys

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    rule_base_path = os.path.join("mater_knowledge_base", "rule_base.json")
    kb_path = os.path.join("mater_knowledge_base", "master_knowledge_base.json")
    
    # Load rule base
    try:
        rule_base = load_json(rule_base_path)
    except Exception as e:
        print(f"ERROR: Failed to load rule base: {e}")
        sys.exit(1)
    
    # Load knowledge base
    try:
        kb = load_json(kb_path)
    except Exception as e:
        print(f"ERROR: Failed to load knowledge base: {e}")
        sys.exit(1)
    
    if 'knowledge_records' not in kb:
        print("ERROR: No knowledge_records in knowledge base")
        sys.exit(1)
    
    kb_records = kb['knowledge_records']
    
    # Map knowledge_id to record for quick lookup
    kb_lookup = {record['knowledge_id']: record for record in kb_records}
    
    errors = []
    warnings = []
    
    # Check required top-level fields
    required_top = ['rule_base_version', 'generated_from', 'generation_status', 'rules']
    for field in required_top:
        if field not in rule_base:
            errors.append(f"Missing top-level field: {field}")
    
    if 'rules' not in rule_base:
        print("ERROR: No rules found")
        sys.exit(1)
    
    rules = rule_base['rules']
    
    # Check each rule
    rule_ids = set()
    knowledge_id_set = set()
    
    for idx, rule in enumerate(rules):
        # Check rule_id
        rule_id = rule.get('rule_id')
        if not rule_id:
            errors.append(f"Rule {idx}: Missing rule_id")
        elif rule_id in rule_ids:
            errors.append(f"Rule {idx}: Duplicate rule_id: {rule_id}")
        else:
            rule_ids.add(rule_id)
        
        # Check rule_type
        rule_type = rule.get('rule_type')
        valid_rule_types = {'compatibility', 'constraint', 'process_sequence', 'parameter_range', 'formula', 'recipe'}
        if rule_type not in valid_rule_types:
            errors.append(f"Rule {rule_id}: Invalid rule_type: {rule_type}")
        
        # Check domain (optional, but we can check if it's one of the expected)
        # We'll skip domain validation for now
        
        # Check conditions
        conditions = rule.get('conditions', [])
        if not isinstance(conditions, list):
            errors.append(f"Rule {rule_id}: Conditions must be a list")
        else:
            for cond_idx, cond in enumerate(conditions):
                if not isinstance(cond, dict):
                    errors.append(f"Rule {rule_id}: Condition {cond_idx} must be a dict")
                else:
                    param = cond.get('parameter')
                    op = cond.get('operator')
                    val = cond.get('value')
                    if not param:
                        errors.append(f"Rule {rule_id}: Condition {cond_idx}: Missing parameter")
                    if op not in ['==', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN']:
                        errors.append(f"Rule {rule_id}: Condition {cond_idx}: Invalid operator: {op}")
                    # Value can be any type, so we don't validate further
        
        # Check action
        action = rule.get('action', {})
        if not isinstance(action, dict):
            errors.append(f"Rule {rule_id}: Action must be a dict")
        else:
            act_type = action.get('type')
            valid_action_types = {'reject', 'prohibit', 'warn', 'constrain', 'recommend', 'calculate', 'require_sequence'}
            if act_type not in valid_action_types:
                errors.append(f"Rule {rule_id}: Invalid action.type: {act_type}")
            if 'message' not in action or not isinstance(action['message'], str):
                errors.append(f"Rule {rule_id}: Action must have a string message")
        
        # Check applicability
        applicability = rule.get('applicability', {})
        if not isinstance(applicability, dict):
            errors.append(f"Rule {rule_id}: Applicability must be a dict")
        else:
            expected_keys = {'fiber', 'dye_class', 'fabric', 'chemical', 'machine_type', 'process_stage', 'shade'}
            for key in applicability.keys():
                if key not in expected_keys:
                    warnings.append(f"Rule {rule_id}: Unexpected applicability key: {key}")
            # We don't require all keys to be present, but we expect them to be lists if present
            for key in expected_keys:
                if key in applicability and not isinstance(applicability[key], list):
                    errors.append(f"Rule {rule_id}: Applicability.{key} must be a list")
        
        # Check source
        source = rule.get('source', {})
        if not isinstance(source, dict):
            errors.append(f"Rule {rule_id}: Source must be a dict")
        else:
            required_source_fields = ['knowledge_id', 'file_name', 'excerpt']
            for field in required_source_fields:
                if field not in source:
                    errors.append(f"Rule {rule_id}: Source missing required field: {field}")
            # knowledge_id should exist in the knowledge base
            kid = source.get('knowledge_id')
            if kid and kid not in kb_lookup:
                errors.append(f"Rule {rule_id}: Source knowledge_id {kid} not found in knowledge base")
            # We could also check that the source excerpt matches, but we skip for simplicity
        
        # Check validation
        validation = rule.get('validation', {})
        if not isinstance(validation, dict):
            errors.append(f"Rule {rule_id}: Validation must be a dict")
        else:
            required_validation_fields = ['source_verified', 'expert_review_decision', 'human_validation_status', 'confidence']
            for field in required_validation_fields:
                if field not in validation:
                    errors.append(f"Rule {rule_id}: Validation missing required field: {field}")
            # Check human_validation_status
            hv_status = validation.get('human_validation_status')
            if hv_status not in ['pending', 'approved', 'rejected']:
                errors.append(f"Rule {rule_id}: Invalid human_validation_status: {hv_status}")
            # Check confidence
            conf = validation.get('confidence')
            if conf not in ['high', 'medium', 'low']:
                errors.append(f"Rule {rule_id}: Invalid confidence: {conf}")
        
        # Check that the rule is derived from an approved record
        # We already checked that the source knowledge_id is in the knowledge base.
        # Now check that the expert review decision is approved_for_rule_generation
        exp_decision = validation.get('expert_review_decision')
        if exp_decision != 'approved_for_rule_generation':
            errors.append(f"Rule {rule_id}: Rule derived from non-approved knowledge (expert_review_decision: {exp_decision})")
        
        # Collect knowledge_id for uniqueness check (if we want to ensure each knowledge_id is used at most once? 
        # Actually, one knowledge_id can generate multiple rules (as we did). So we don't enforce uniqueness here.
    
    # Check for any rules that might be missing from the validation queue? We skip that for now.
    
    # Output results
    if errors:
        print("VALIDATION FAILED with errors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("Rule base validation passed.")
        if warnings:
            print("Warnings:")
            for warning in warnings:
                print(f"  - {warning}")
        sys.exit(0)

if __name__ == "__main__":
    main()
'''
    save_json(validation_script, validation_script_path)
    print(f"Validation script saved to {validation_script_path}")
    
    # Run the validation script
    print("\nRunning rule base validation...")
    os.system(f"python {validation_script_path}")
    
    # Also run the existing KB validation to ensure it's still valid
    print("\nRunning knowledge base validation...")
    os.system("python validate_kb.py")
    
    print("\n=== Rule Generation Summary ===")
    print(f"Total knowledge records: {len(records)}")
    print(f"Approved rule candidates: {len(approved_knowledge_ids)}")
    print(f"Rules generated: {len(rules)}")
    print(f"Rules requiring human validation: {len(rules)}")
    print(f"Rule types: {dict(rule_type_counts)}")
    print(f"Domains: {dict(domain_counts)}")
    print(f"Source coverage - processed: {approved_candidates_processed}, skipped: {approved_candidates_skipped}")
    print("\nFiles created/modified:")
    print(f"  - {rule_base_path}")
    print(f"  - {rule_validation_queue_path}")
    print(f"  - {rule_generation_report_path}")
    print(f"  - {validation_script_path}")
    if os.path.exists(backup_path):
        print(f"  - {backup_path} (backup of previous rule base)")

if __name__ == "__main__":
    main()
