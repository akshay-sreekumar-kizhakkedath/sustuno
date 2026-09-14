
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
