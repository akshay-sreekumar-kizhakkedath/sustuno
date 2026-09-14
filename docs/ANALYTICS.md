# SUSTUNO — Analytics & Process Intelligence

> Status: IMPLEMENTED (live Supabase aggregations) / DATA-DEPENDENT (metrics appear only when real data exists; honest empty states otherwise).


## Real Database Aggregations
- **Optimization Frequency**: Real count of sessions from `dye_opt_sessions`.
- **Batch Count**: Real count of batches from `dye_batches`.
- **Process Deviations**: Planned vs actual parameter comparisons.
- **Empty States**: Displays clean empty state notices ("No historical optimization records available yet.") when database tables contain 0 records.

