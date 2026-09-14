# Supabase Setup for Aquatex AI Dashboard

## Quick Start

1. Create a Supabase project at https://supabase.com
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` (see `.env.example`)
3. Run the migration SQL: `supabase/migrations/001_create_schema.sql`
4. Insert initial reference data from `scripts/seed_reference_data.sql`
5. Enable real-time for tables listed in the migration

## Schema Overview (42 Tables)

| Category | Tables |
|---|---|
| Production | batches, fabric_details, dye_machine_settings, chemical_recipe_analysis, resource_utilization |
| IoT / Sensors | iot_sensors, sensor_telemetry, tank_levels, gateway_status, iot_alerts |
| ETP / Treatment | etp_kpis, etp_decisions, etp_decision_chips, treatment_strategy, chemical_dosing, ph_control, machine_directives, etp_financials |
| Water Quality | water_quality_kpis, water_quality_trends |
| AI / Predictions | ai_insights, predicted_quality, etp_strategies, workflow_steps, system_alerts, compliance_score |
| Forms / Config | optimizer_form, predictor_form |
| Environment | environmental_metrics, water_usage_series, compliance_trends |
| Savings / Models | savings_portfolio, model_accuracy |
| Analytics | analytics_filters, prediction_kpis, optimized_recipes, impact_metrics, control_center |
| Reports | report_types, facility_segments, export_formats, recent_reports, insights_summary |

## Storage Buckets

- `recipe-uploads` — uploaded dye recipes
- `reports` — generated PDF/Excel reports
- `ai-models` — exported AI model files
- `documentation` — ETP treatment rules

## Real-time Subscriptions

Enabled automatically by the service layer for:
- `sensor_telemetry`
- `water_quality_kpis`
- `iot_alerts`
- `machine_directives`
- `etp_decisions`
