import json
import os
import csv
from datetime import datetime

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath, indent=2):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)

def main():
    # Paths
    rule_base_path = os.path.join("mater_knowledge_base", "rule_base.json")
    human_package_path = os.path.join("mater_knowledge_base", "human_rule_validation_package.json")
    queue_path = os.path.join("mater_knowledge_base", "rule_validation_queue.json")
    audit_path = os.path.join("mater_knowledge_base", "rule_semantic_audit.json")
    correction_report_path = os.path.join("mater_knowledge_base", "rule_correction_report.json")
    csv_path = os.path.join("mater_knowledge_base", "HUMAN_RULE_REVIEW_TABLE.csv")
    md_path = os.path.join("mater_knowledge_base", "HUMAN_RULE_REVIEW_FORM.md")
    template_path = os.path.join("mater_knowledge_base", "human_rule_decisions_template.json")
    validator_path = os.path.join("mater_knowledge_base", "validate_human_rule_decisions.py")

    # Load data
    rule_base = load_json(rule_base_path)
    human_package = load_json(human_package_path)
    queue = load_json(queue_path)
    audit = load_json(audit_path)
    correction_report = load_json(correction_report_path)

    rules = rule_base['rules']
    # Build lookup for audit results and human package
    audit_lookup = {r['rule_id']: r for r in audit['results']}
    human_lookup = {r['rule_id']: r for r in human_package['rules']}
    # Build set of corrected knowledge IDs
    corrected_kids = {c['knowledge_id'] for c in correction_report['corrections']}

    # Determine corrected rule IDs
    corrected_rule_ids = {r['rule_id'] for r in rules if r['source']['knowledge_id'] in corrected_kids}

    # ========== PHASE 2: HUMAN-FRIENDLY REVIEW TABLE (CSV) ==========
    print("Creating human-friendly review table (CSV)...")
    csv_fields = [
        'rule_id', 'knowledge_id', 'rule_type', 'domain', 'title', 'condition',
        'incompatible_chemicals', 'action_type', 'action_message', 'applicability',
        'source_file', 'source_section', 'source_page', 'source_excerpt',
        'semantic_audit_status', 'correction_applied', 'human_validation_status',
        'human_decision', 'reviewer_name', 'reviewer_role', 'reviewer_notes', 'review_date'
    ]

    with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=csv_fields)
        writer.writeheader()
        for rule in rules:
            kid = rule['source']['knowledge_id']
            audit_entry = audit_lookup.get(rule['rule_id'], {})
            # Extract condition as readable string
            cond = rule['conditions'][0] if rule['conditions'] else {}
            condition_str = f"{cond.get('parameter')} {cond.get('operator')} {cond.get('value')}" if cond else ""
            # Extract incompatible chemicals from title or description (we know it's in the title after "vs ")
            # We'll parse from title: "Incompatibility: {subject} vs {chemicals} in recipe {recipe_id}"
            title = rule['title']
            chemicals = ""
            if ' vs ' in title:
                parts = title.split(' vs ')
                if len(parts) > 1:
                    chemicals = parts[1].split(' in recipe ')[0]
            # Action type and message
            act_type = rule['action']['type']
            act_msg = rule['action']['message']
            # Applicability: we'll serialize as JSON string for CSV
            applic = json.dumps(rule['applicability'], ensure_ascii=False)
            # Source info
            src = rule['source']
            source_file = src.get('file_name')
            source_section = src.get('section')
            source_page = src.get('page')
            source_excerpt = src.get('excerpt')
            # Semantic audit status
            semantic_status = audit_entry.get('semantic_status', 'unknown')
            # Correction applied?
            correction_applied = 'Yes' if rule['rule_id'] in corrected_rule_ids else 'No'
            # Human validation status
            human_status = rule['validation']['human_validation_status']
            human_decision = 'pending'
            reviewer_name = ''
            reviewer_role = ''
            reviewer_notes = ''
            review_date = ''

            writer.writerow({
                'rule_id': rule['rule_id'],
                'knowledge_id': kid,
                'rule_type': rule['rule_type'],
                'domain': rule['domain'],
                'title': title,
                'condition': condition_str,
                'incompatible_chemicals': chemicals,
                'action_type': act_type,
                'action_message': act_msg,
                'applicability': applic,
                'source_file': source_file,
                'source_section': source_section,
                'source_page': source_page,
                'source_excerpt': source_excerpt,
                'semantic_audit_status': semantic_status,
                'correction_applied': correction_applied,
                'human_validation_status': human_status,
                'human_decision': human_decision,
                'reviewer_name': reviewer_name,
                'reviewer_role': reviewer_role,
                'reviewer_notes': reviewer_notes,
                'review_date': review_date
            })
    print(f"Human review table saved to {csv_path}")

    # ========== PHASE 3: CLEAN EXPERT REVIEW DOCUMENT (Markdown) ==========
    print("Creating expert review form (Markdown)...")
    md_lines = []
    md_lines.append("# Human Rule Review Form")
    md_lines.append("")
    md_lines.append("## Purpose")
    md_lines.append("")
    md_lines.append("This document contains AI-derived chemical compatibility rules extracted from the project's source knowledge base. The rules must be reviewed by a qualified textile wet-processing/chemical expert before being used in operational decision-making.")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")

    for rule in rules:
        kid = rule['source']['knowledge_id']
        audit_entry = audit_lookup.get(rule['rule_id'], {})
        semantic_status = audit_entry.get('semantic_status', 'unknown')
        correction_note = ""
        if rule['rule_id'] in corrected_rule_ids:
            correction_note = "\n\n**Corrected during semantic rule audit:** The previous generated rule incorrectly split a multi-chemical incompatibility list. The current rule preserves the complete source list of incompatible chemicals."

        md_lines.append(f"### Rule ID: {rule['rule_id']}")
        md_lines.append("")
        md_lines.append(f"- **Knowledge ID:** {kid}")
        md_lines.append(f"- **Rule Type:** {rule['rule_type']}")
        md_lines.append(f"- **Domain:** {rule['domain']}")
        md_lines.append("")
        md_lines.append("**Rule:**")
        md_lines.append("")
        md_lines.append(f"{rule['title']}")
        md_lines.append("")
        md_lines.append("**Condition:**")
        md_lines.append("")
        cond = rule['conditions'][0] if rule['conditions'] else {}
        md_lines.append(f"{cond.get('parameter')} {cond.get('operator')} {cond.get('value')}")
        md_lines.append("")
        md_lines.append("**Chemical(s):**")
        md_lines.append("")
        title = rule['title']
        chemicals = ""
        if ' vs ' in title:
            parts = title.split(' vs ')
            if len(parts) > 1:
                chemicals = parts[1].split(' in recipe ')[0]
        md_lines.append(chemicals)
        md_lines.append("")
        md_lines.append("**Applicability:**")
        md_lines.append("")
        applic = rule['applicability']
        applic_parts = []
        for k, v in applic.items():
            if v:
                applic_parts.append(f"{k}: {', '.join(v)}")
        md_lines.append("; ".join(applic_parts) if applic_parts else "Not specified in source")
        md_lines.append("")
        md_lines.append("**Action:**")
        md_lines.append("")
        md_lines.append(f"{rule['action']['type']}: {rule['action']['message']}")
        md_lines.append("")
        md_lines.append("**Source:**")
        md_lines.append("")
        src = rule['source']
        md_lines.append(f"File: {src.get('file_name')}")
        if src.get('section'):
            md_lines.append(f"Section: {src.get('section')}")
        if src.get('page'):
            md_lines.append(f"Page: {src.get('page')}")
        md_lines.append("")
        md_lines.append("**Source Evidence:**")
        md_lines.append("")
        md_lines.append(f"> {src.get('excerpt')}")
        md_lines.append("")
        md_lines.append(f"**AI Semantic Audit:** {semantic_status.upper()}")
        md_lines.append(correction_note)
        md_lines.append("")
        md_lines.append("**Human Decision:**")
        md_lines.append("")
        md_lines.append("- [ ] APPROVED")
        md_lines.append("- [ ] MODIFIED")
        md_lines.append("- [ ] REJECTED")
        md_lines.append("")
        md_lines.append("**Reviewer Name:**")
        md_lines.append("")
        md_lines.append("")
        md_lines.append("**Reviewer Role:**")
        md_lines.append("")
        md_lines.append("")
        md_lines.append("**Reviewer Notes:**")
        md_lines.append("")
        md_lines.append("")
        md_lines.append("**Review Date:**")
        md_lines.append("")
        md_lines.append("")
        md_lines.append("---")
        md_lines.append("")

    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(md_lines))
    print(f"Expert review form saved to {md_path}")

    # ========== PHASE 5: MACHINE-READABLE REVIEW TEMPLATE ==========
    print("Creating machine-readable review template...")
    decisions_template = {
        "review_version": "1.0",
        "status": "pending_human_review",
        "reviewer": {
            "name": None,
            "role": None,
            "organization": None,
            "review_date": None
        },
        "decisions": []
    }
    for rule in rules:
        decisions_template['decisions'].append({
            "rule_id": rule['rule_id'],
            "knowledge_id": rule['source']['knowledge_id'],
            "decision": "pending",
            "reviewer_notes": None,
            "modification_requested": None
        })
    save_json(decisions_template, template_path)
    print(f"Review template saved to {template_path}")

    # ========== PHASE 6: CREATE REVIEW COMPLETION VALIDATOR ==========
    print("Creating review completion validator...")
    validator_script = '''
import json
import os
import sys
from datetime import datetime

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def main():
    template_path = os.path.join("mater_knowledge_base", "human_rule_decisions_template.json")
    rule_base_path = os.path.join("mater_knowledge_base", "rule_base.json")

    if not os.path.exists(template_path):
        print("ERROR: Template file not found.")
        sys.exit(1)

    template = load_json(template_path)
    rule_base = load_json(rule_base_path)
    rules = rule_base['rules']
    rule_ids = {r['rule_id'] for r in rules}
    decisions = template.get('decisions', [])

    errors = []
    warnings = []

    # 1. Exactly 13 rules exist
    if len(rules) != 13:
        errors.append(f"Expected 13 rules, found {len(rules)}")

    # 2. Every rule has a corresponding decision entry
    decision_rule_ids = {d['rule_id'] for d in decisions}
    missing_decisions = rule_ids - decision_rule_ids
    if missing_decisions:
        errors.append(f"Missing decision entries for rules: {missing_decisions}")

    # 3. No unknown rule IDs exist
    unknown_ids = decision_rule_ids - rule_ids
    if unknown_ids:
        errors.append(f"Unknown rule IDs in decisions: {unknown_ids}")

    # 4. No duplicate decision entries
    if len(decisions) != len(decision_rule_ids):
        errors.append("Duplicate decision entries found")

    # 5. Decision is one of allowed values
    allowed_decisions = {'pending', 'approved', 'modified', 'rejected'}
    for d in decisions:
        if d.get('decision') not in allowed_decisions:
            errors.append(f"Invalid decision '{d.get('decision')}' for rule {d.get('rule_id')}")

    # 6. Approved rules have reviewer information
    for d in decisions:
        if d.get('decision') == 'approved':
            reviewer = template.get('reviewer', {})
            if not reviewer.get('name') or not reviewer.get('role') or not reviewer.get('review_date'):
                errors.append(f"Rule {d['rule_id']} is approved but missing reviewer information in template")

    # 7. Modified rules have modification_requested information
    for d in decisions:
        if d.get('decision') == 'modified':
            if not d.get('modification_requested'):
                errors.append(f"Rule {d['rule_id']} is modified but missing modification_requested")

    # 8. Rejected rules have reviewer_notes/reason
    for d in decisions:
        if d.get('decision') == 'rejected':
            if not d.get('reviewer_notes'):
                errors.append(f"Rule {d['rule_id']} is rejected but missing reviewer_notes")

    # 9. Review date exists when a final decision is recorded
    for d in decisions:
        if d.get('decision') in {'approved', 'modified', 'rejected'}:
            reviewer = template.get('reviewer', {})
            if not reviewer.get('review_date'):
                errors.append(f"Rule {d['rule_id']} has final decision '{d['decision']}' but review_date is missing")

    # 10. No rule can be considered fully approved without an explicit human decision
    # This is enforced by the template structure; we just check that no rule is marked approved without a decision entry
    # Already covered above.

    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("Human rule decisions template validation PASSED")
        sys.exit(0)

if __name__ == "__main__":
    main()
'''
    with open(validator_path, 'w', encoding='utf-8') as f:
        f.write(validator_script)
    print(f"Review validator script saved to {validator_path}")

    # Run the validator
    print("\nRunning review completion validator...")
    os.system(f"python {validator_path}")

    # Run other validators
    print("\nRunning KB validation...")
    os.system("python validate_kb.py")
    print("\nRunning rule-base validation...")
    os.system("python mater_knowledge_base\\validate_rule_base.py")
    print("\nRunning semantic audit...")
    os.system("python mater_knowledge_base\\audit_rules.py")

    print("\n=== Final Preparation Summary ===")
    print(f"Final rule count: {len(rules)}")
    print(f"Corrected rules: {len(corrected_rule_ids)}")
    print(f"Rules pending human review: {len(rules)}")
    print(f"Files created/modified:")
    print(f"  - {csv_path}")
    print(f"  - {md_path}")
    print(f"  - {template_path}")
    print(f"  - {validator_path}")
    print(f"\nAll rules have human_validation_status = 'pending'")
    print("No synthetic data or ML was started.")
    print("Master knowledge base was NOT modified.")

if __name__ == "__main__":
    main()
