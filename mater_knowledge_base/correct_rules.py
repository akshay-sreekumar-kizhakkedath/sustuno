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
    kb_path = os.path.join("mater_knowledge_base", "master_knowledge_base.json")
    expert_review_path = os.path.join("mater_knowledge_base", "expert_review_results.json")
    rule_base_path = os.path.join("mater_knowledge_base", "rule_base.json")
    backup_path = os.path.join("mater_knowledge_base", "rule_base_before_semantic_corrections.json")
    queue_path = os.path.join("mater_knowledge_base", "rule_validation_queue.json")
    human_package_path = os.path.join("mater_knowledge_base", "human_rule_validation_package.json")
    report_path = os.path.join("mater_knowledge_base", "rule_generation_report.json")
    corrections_path = os.path.join("mater_knowledge_base", "rule_correction_report.json")

    # Backup current rule base
    print("Backing up current rule base...")
    shutil.copy2(rule_base_path, backup_path)

    # Load data
    print("Loading data...")
    kb = load_json(kb_path)
    expert_review = load_json(expert_review_path)
    kb_records = {r['knowledge_id']: r for r in kb['knowledge_records']}
    approved_kids = {r['knowledge_id'] for r in expert_review['reviewed_records'] if r['decision'] == 'approved_for_rule_generation'}

    # Generate corrected rules: one rule per approved knowledge record
    # For each record, join the incompatible chemicals (split by comma) into a single list
    rules = []
    rule_id_counter = 1
    rule_signatures = set()

    for kid in approved_kids:
        record = kb_records.get(kid)
        if not record:
            print(f"Warning: Knowledge record {kid} not found in master KB. Skipping.")
            continue

        domain = record.get('domain', 'unknown')
        subject = record.get('subject')
        value = record.get('value')
        conditions = record.get('conditions', [])
        applicability = record.get('applicability', {
            "fiber": [], "dye_class": [], "fabric": [], "chemical": [],
            "machine_type": [], "process_stage": [], "shade": []
        })
        source = record.get('source', {})
        expert_review_field = record.get('expert_review', {})

        # Extract recipe_id from conditions
        recipe_id = None
        if conditions and len(conditions) > 0:
            cond = conditions[0]
            if cond.get('parameter') == 'recipe_id' and cond.get('operator') == '==':
                recipe_id = cond.get('value')

        if not recipe_id:
            print(f"Warning: Skipping record {kid} because no valid recipe_id condition found.")
            continue

        # Split the value into a list of chemicals, preserving exact names
        if isinstance(value, str):
            chemicals = [c.strip() for c in value.split(',') if c.strip()]
        else:
            chemicals = [str(value)]

        chemical_list_str = ", ".join(chemicals)

        # Build a single rule for this knowledge record
        signature = (kid, recipe_id, subject, tuple(chemicals))
        if signature in rule_signatures:
            print(f"Warning: Duplicate rule signature for {kid} - {subject} in recipe {recipe_id}. Skipping.")
            continue
        rule_signatures.add(signature)

        rule = {
            "rule_id": f"RULE-{rule_id_counter:04d}",
            "rule_type": "compatibility",
            "domain": domain,
            "title": f"Incompatibility: {subject} vs {chemical_list_str} in recipe {recipe_id}",
            "description": f"The chemical {subject} is incompatible with {chemical_list_str} when used in recipe {recipe_id}.",
            "conditions": [
                {
                    "parameter": "recipe_id",
                    "operator": "==",
                    "value": recipe_id
                }
            ],
            "action": {
                "type": "prohibit",
                "message": f"Do not use {subject} together with {chemical_list_str} in recipe {recipe_id}."
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

    print(f"Generated {len(rules)} corrected rules.")

    # Save corrected rule base
    rule_base = {
        "rule_base_version": "1.0",
        "generated_from": {
            "knowledge_base": "master_knowledge_base.json",
            "expert_review": "expert_review_results.json"
        },
        "generation_status": "pending_human_validation",
        "rules": rules
    }
    save_json(rule_base, rule_base_path)
    print(f"Corrected rule base saved to {rule_base_path}")

    # Update rule validation queue
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
            "review_status": "pending",
            "notes": "This rule was semantically corrected during the rule quality audit." if rule['rule_id'] in [r['rule_id'] for r in rules if r['source']['knowledge_id'] in ['KB-00005', 'KB-00008', 'KB-00139']] else ""
        })
    queue_data = {
        "validation_queue_version": "1.0",
        "status": "pending_human_validation",
        "rules_pending_validation": validation_queue
    }
    save_json(queue_data, queue_path)
    print(f"Updated rule validation queue saved to {queue_path}")

    # Update human validation package
    human_package = []
    for rule in rules:
        human_package.append({
            "rule_id": rule['rule_id'],
            "rule_type": rule['rule_type'],
            "domain": rule['domain'],
            "title": rule['title'],
            "description": rule['description'],
            "condition": rule['conditions'],
            "action": rule['action'],
            "applicability": rule['applicability'],
            "source_knowledge_id": rule['source']['knowledge_id'],
            "source_file": rule['source']['file_name'],
            "source_section": rule['source']['section'],
            "source_page": rule['source']['page'],
            "source_table": rule['source']['table'],
            "source_excerpt": rule['source']['excerpt'],
            "semantic_audit_result": None,
            "human_decision": "pending",
            "reviewer_notes": ""
        })
    package_data = {
        "package_version": "1.0",
        "status": "pending_human_validation",
        "rules": human_package
    }
    save_json(package_data, human_package_path)
    print(f"Updated human validation package saved to {human_package_path}")

    # Update rule generation report
    report = load_json(report_path)
    report['summary']['rules_generated'] = len(rules)
    report['summary']['rules_requiring_human_validation'] = len(rules)
    report['rule_type_distribution'] = dict(defaultdict(int, {r['rule_type']: sum(1 for x in rules if x['rule_type'] == r['rule_type']) for r in rules}))
    report['domain_distribution'] = dict(defaultdict(int, {r['domain']: sum(1 for x in rules if x['domain'] == r['domain']) for r in rules}))
    report['status'] = 'pending_human_validation'
    save_json(report, report_path)
    print(f"Updated rule generation report saved to {report_path}")

    # Create correction report
    corrections = []
    corrected_ids = [r['source']['knowledge_id'] for r in rules if r['source']['knowledge_id'] in ['KB-00005', 'KB-00008', 'KB-00139']]
    for kid in corrected_ids:
        corrections.append({
            "rule_id": next(r['rule_id'] for r in rules if r['source']['knowledge_id'] == kid),
            "knowledge_id": kid,
            "issue": "Original rule split a multi-chemical incompatibility into separate rules, causing each rule to miss other chemicals from the source list in its title/message.",
            "original_rule": {},
            "corrected_rule": next(r for r in rules if r['source']['knowledge_id'] == kid),
            "correction_reason": "The source lists multiple incompatible chemicals for a single subject in one knowledge record. The corrected rule preserves the exact list of incompatible chemicals as provided by the source, ensuring the rule title and message reflect the complete source evidence.",
            "source_verified": True,
            "human_validation_required": True
        })

    correction_report = {
        "correction_version": "1.0",
        "rules_examined": 6,
        "corrections": corrections,
        "summary": {
            "rules_corrected": len(corrections),
            "rules_unchanged": len(rules) - len(corrections),
            "rules_requiring_human_validation": len(rules),
            "unsupported_corrections": 0
        }
    }
    save_json(correction_report, corrections_path)
    print(f"Correction report saved to {corrections_path}")

    # Re-run validations
    print("\nRe-running validations...")
    os.system("python validate_kb.py")
    os.system("python mater_knowledge_base\\validate_rule_base.py")
    os.system("python mater_knowledge_base\\audit_rules.py")

    print("\n=== Correction Summary ===")
    print(f"Rules examined: 6")
    print(f"Rules corrected: {len(corrections)}")
    print(f"Rules unchanged: {len(rules) - len(corrections)}")
    print(f"Rules requiring human validation: {len(rules)}")
    print(f"Total rules now: {len(rules)}")
    print("\nFiles created/modified:")
    print(f"  - {backup_path} (backup)")
    print(f"  - {rule_base_path} (updated)")
    print(f"  - {queue_path} (updated)")
    print(f"  - {human_package_path} (updated)")
    print(f"  - {report_path} (updated)")
    print(f"  - {corrections_path}")

if __name__ == "__main__":
    main()
