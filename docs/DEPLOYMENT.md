# SUSTUNO — Deployment & Environment Guide

> Status: IMPLEMENTED. Frontend production build passes; backend /api/health and all non-batch endpoints verified live. Full batch workflow activates after migration 004 is applied (one manual SQL step).


## Prerequisites
- Node.js >= 18
- Python >= 3.10
- Supabase PostgreSQL instance

## Verification Commands
```bash
# 1. Frontend Production Build
cd "dash board/aquatex-ai-react"
npm run build

# 2. Start Express Backend
cd "dash board/backend"
npm start

# 3. Execute Test Suites
cd "D:/SUSTUNO"
node tests/dye_optimizer_tests.js
node tests/dye_batch_tests.js
node tests/dye_ml_pipeline_tests.js
node tests/wastewater_and_etp_tests.js
```

