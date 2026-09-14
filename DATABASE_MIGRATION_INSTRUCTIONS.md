# Database Migration Instructions for Dye Optimization Feature

## Prerequisites
- Supabase project URL and service role key configured in `dash board/backend/.env`
- Network access to your Supabase database host (port 5432) from the machine running the migration

## Migration Order
Due to foreign key dependencies, you must apply the migrations in this order:

1. **Base Schema** (creates batches table and other core tables)
   - File: `dash board/aquatex-ai-react/supabase/migrations/001_create_schema.sql`

2. **Dye Optimization Tables** (adds new tables for optimization feature)
   - File: `database/migrations/002_dye_optimization_tables.sql`

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://qwbztkumlcwqtkjpvoca.supabase.co
2. Navigate to **SQL Editor**
3. Click **+ New Query**
4. **First**, copy and paste the entire contents of:
   `dash board/aquatex-ai-react/supabase/migrations/001_create_schema.sql`
5. Click **Run**
6. **Second**, copy and paste the entire contents of:
   `database/migrations/002_dye_optimization_tables.sql`
7. Click **Run**

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if needed: npm install -g supabase
# Link your project (find project ref in Supabase dashboard > Settings > API)
supabase link --project-ref [your-project-ref]

# Apply migrations in order
supabase db push  # This will apply all pending migrations
# Or apply files individually:
# supabase migration up --file dash board/aquatex-ai-react/supabase/migrations/001_create_schema.sql
# supabase migration up --file database/migrations/002_dye_optimization_tables.sql
```

### Option 3: Direct SQL Execution (psql or PostgreSQL client)
```bash
# Get your Supabase connection string:
#   Host: db.[project-ref].supabase.co
#   Port: 5432
#   Database: postgres
#   Username: postgres
#   Password: [your-service-role-key]

# Apply base schema first
psql "host=db.[project-ref].supabase.co port=5432 dbname=postgres user=postgres password=[your-service-role-key] sslmode=require" -f dash board/aquatex-ai-react/supabase/migrations/001_create_schema.sql

# Then apply dye optimization tables
psql "host=db.[project-ref].supabase.co port=5432 dbname=postgres user=postgres password=[your-service-role-key] sslmode=require" -f database/migrations/002_dye_optimization_tables.sql
```

## Verification
After applying both migrations:
1. Start the backend: `cd dash board/backend && node server.js`
2. Verify health endpoints:
   - `http://localhost:5000/api/health` → `{"status":"ok"}`
   - `http://localhost:5000/api/health/db` → Should show `{"status":"ok","database":"connected",...}`
3. In Supabase Dashboard → Table Editor, verify these tables exist:
   - `batches` (from base schema)
   - `dye_opt_sessions`, `dye_opt_inputs`, `dye_opt_outputs`, `dye_opt_constraints` (from dye optimization migration)

## Notes
- The base schema (`001_create_schema.sql`) is already part of your frontend project and may have been applied previously. Running it again is safe because it uses `CREATE TABLE IF NOT EXISTS`.
- The dye optimization migration is designed to be additive and will not affect existing tables or data.
- Your existing code and knowledge base remain unchanged.
- If you encounter any issues, please check the Supabase logs or contact support.

## Troubleshooting
- **"relation "batches" does not exist"**: This means the base schema hasn't been applied yet. Apply `001_create_schema.sql` first.
- **Connection errors**: Ensure your machine can reach `db.[project-ref].supabase.co:5432`. Check firewall settings and network connectivity.
- **Permission errors**: Make sure you're using the service role key (not the anon key) for migrations.

---
Migration files are ready in your project. Please follow the steps above to complete the database setup for the dye optimization feature.
## Migration 004 � Dye Batch Tables (REQUIRED, pending as of 2026-09-14)

Live-schema audit found that 003 was never applied: dye_batches and dye_batch_* tables do not exist in the live project. Until 004 is applied, batch write/read endpoints return honest DB_SCHEMA_NOT_PROVISIONED / collecting states and the frontend shows empty states.

**Apply now (Supabase Dashboard > SQL Editor > + New Query):** paste the entire contents of database/migrations/004_provision_dye_batch_tables.sql and click Run. The script is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) and deletes no data.

**Verify:** Table Editor shows dye_batches, dye_batch_dyes, dye_batch_chemicals, dye_batch_process, dye_batch_target_shade, dye_batch_shade_results, model_versions; then GET /api/ml/dye-dataset/readiness returns provisioned data instead of the not-provisioned note.

