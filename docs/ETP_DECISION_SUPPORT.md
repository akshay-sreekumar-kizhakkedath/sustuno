# SUSTUNO — Effluent Treatment Plant (ETP) Decision Support System

## Advisory Decision Support
- **Scope**: Decision support only. **MUST NOT** directly control physical plant valves or pumps.
- **Rule Integration**: Incorporates 13 domain rules from `rule_base.json` (`human_validation_status = 'pending'`).
- **Chemical Dosing**: Returns `recommendation_status = 'insufficient_data'` when exact jar test data or inlet COD measurements are unpopulated, rather than fabricating dosing quantities.
- **Explainability**: Every response includes `recommendation`, `reason`, `evidence`, `rules`, `assumptions`, and `limitations`.
- **Final Water Reuse Loop**: `FUTURE_SCOPE`
