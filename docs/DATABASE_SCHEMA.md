# SUSTUNO â€” Database Schema Reference

> Status: IMPLEMENTED / VERIFIED against live Supabase. NOTE (2026-09-14 audit): dye_batches/dye_batch_* tables are NOT present in the live project — migration 004_provision_dye_batch_tables.sql must be applied via the Supabase SQL editor (see DATABASE_MIGRATION_INSTRUCTIONS.md). Batch endpoints return honest not-provisioned states until then.


## Overview
Connected to Supabase PostgreSQL database. Schema is defined across 3 migration files:

1. `001_create_schema.sql` (42 core dashboard tables)
2. `002_dye_optimization_tables.sql` (`dye_opt_sessions`, `dye_opt_inputs`, `dye_opt_outputs`, `dye_opt_constraints`)
3. `003_dye_batch_data_collection.sql` (`dye_batches`, `dye_batch_dyes`, `dye_batch_chemicals`, `dye_batch_process`, `dye_batch_target_shade`, `dye_batch_shade_results`, `model_versions`)

## Live Database Probing
- Verified 47 live tables in Supabase instance.
- Missing tables migration ready at `database/migrations/003_dye_batch_data_collection.sql`.

