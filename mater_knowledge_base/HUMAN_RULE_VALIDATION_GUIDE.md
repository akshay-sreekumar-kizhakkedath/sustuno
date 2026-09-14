# Human Rule Validation Guide

This guide explains how to validate each rule in the rule base. 
You are a domain expert in textile dyeing and chemical processes. 
Your expertise is required to ensure that the rules are technically correct and safe for operational use.

## Important Notes

- **Human expert approval is required before these rules are used in operational decision-making.**
- AI-assisted semantic validation does not replace textile wet-processing/chemical-process expertise.
- Each rule is derived from a specific source knowledge record that has been expert-reviewed and approved for rule generation.
- Do not modify the source evidence. If you believe a rule is incorrect, provide your decision and notes in the validation package.

## How to Validate Each Rule

For each rule, please consider the following questions:

1. **Is the chemical incompatibility technically correct?**
   - Based on your knowledge, is the stated chemical incompatibility accurate?

2. **Is it valid specifically for the stated recipe?**
   - The rule is conditioned on a specific recipe ID. Is the incompatibility valid only for that recipe, or does it apply more broadly/narrowly?

3. **Is the recipe condition correctly represented?**
   - Does the rule correctly specify the recipe ID (or other condition) under which the incompatibility holds?

4. **Is the action/message appropriate?**
   - Is the action type (e.g., prohibit) and the message clear and correct?

5. **Is the rule too broad?**
   - Does the rule apply to more chemicals, recipes, or conditions than the source supports?

6. **Is any important condition missing?**
   - Are there additional conditions (e.g., temperature, pH, fiber type) that should be included for the rule to be accurate?

7. **Should the rule be modified?**
   - If you believe the rule needs changes, please describe the modification.

8. **Is the source evidence sufficient for operational use?**
   - Does the source document provide enough detail to support the rule as a deterministic constraint?

9. **Would applying this rule in a textile dyeing process create an unsafe or incorrect recommendation?**
   - Consider safety, quality, and process implications.

10. **Should the rule remain advisory rather than become a hard prohibition?**
    - Based on the evidence, should the rule be a warning instead of a prohibition?

## How to Record Your Decision

For each rule in the human validation package (`human_rule_validation_package.json`), please set:

- `human_decision` to one of: `"approved"`, `"rejected"`, or `"modified"`
- `reviewer_notes` to explain your decision and any suggested modifications.

If you choose `"modified"`, please also provide a suggested corrected rule in the notes or in a separate document.

## Submission

Please return the completed `human_rule_validation_package.json` file with your decisions and notes.

Thank you for your expertise.
