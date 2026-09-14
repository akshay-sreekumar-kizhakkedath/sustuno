# Existing Database Schema Audit

**Source:** `/d/SUSTUNO/dash board/aquatex-ai-react/supabase/migrations/001_create_schema.sql`
**Date:** 2026-09-13
**Total Tables:** 42

## Table Classification by Dye Optimization Requirements

### EXISTING_AND_REUSABLE

1. **batches** - Production batch management
   - Primary key: id (UUID)
   - Purpose: Track production batches with operators, shifts, timing
   - Status: ✅ Fully supports batch lifecycle management
   - Relevance: HIGH - Core entity for dye optimization

2. **fabric_details** - Fabric information per batch
   - Primary key: id (UUID)
   - Foreign key: batches.id (ON DELETE CASCADE)
   - Purpose: Store fabric type, weight, GSM, lot numbers
   - Status: ✅ Supports fabric material tracking
   - Relevance: HIGH - Material foundation for recipes

3. **dye_machine_settings** - Machine configuration
   - Primary key: id (UUID)
   - Foreign key: batches.id (ON DELETE CASCADE)
   - Purpose: Dye settings per machine (shade, duration, ratio)
   - Status: ✅ Provides machine recipe parameters
   - Relevance: HIGH - Direct recipe component

4. **water_quality_kpis** - Sensor KPIs
   - Primary key: id (UUID)
   - Purpose: pH, EC, turbidity, temperature, flow rate monitoring
   - Status: ✅ Provides quality metrics for optimization
   - Relevance: HIGH - Critical input for dye recipes

5. **iot_sensors** - Sensor inventory
   - Primary key: id (UUID)
   - Purpose: Sensor catalog with locations and types
   - Status: ✅ Manages sensor array configuration
   - Relevance: MEDIUM - IoT integration infrastructure

6. **resource_utilization** - Resource consumption
   - Primary key: id (UUID)
   - Foreign key: batches.id (ON DELETE CASCADE)
   - Purpose: Track chemical usage, efficiency percentages
   - Status: ✅ Supports resource impact analysis
   - Relevance: HIGH - Chemical dosing optimization

7. **chemical_dosing** - Historical dosing records
   - Primary key: id (UUID)
   - Purpose: Store actual chemical amounts per batch
   - Status: ✅ Provides historical dosing data
   - Relevance: HIGH - Optimization learning data

8. **ph_control** - pH management
   - Primary key: id (UUID)
   - Purpose: pH targets and control actions
   - Status: ✅ pH regulation support
   - Relevance: HIGH - Critical dye bath parameter

9. **machine_directives** - Production directives
   - Primary key: id (UUID)
   - Purpose: Machine instructions and settings
   - Status: ✅ Provides execution rules
   - Relevance: MEDIUM - Operational control

10. **environmental_metrics** - Environmental KPIs
    - Primary key: id (UUID)
    - Purpose: Compliance and efficiency metrics
    - Status: ✅ Supports sustainability tracking
    - Relevance: MEDIUM - Regulatory requirements

11. **insights_summary** - Analytics summaries
    - Primary key: id (UUID)
    - Purpose: High-level business insights
    - Status: ✅ Provides executive reporting
    - Relevance: LOW - Business intelligence

### EXISTING_BUT_NEEDS_EXTENSION

1. **iot_alerts** - Alert system
   - Primary key: id (UUID)
   - Need: Add dye-specific alert types (shade deviation, temperature, pH)
   - Relevance: HIGH - Real-time monitoring needs

2. **etp_kpis** - ETP process KPIs
   - Primary key: id (UUID)
   - Need: Add specific dye process metrics (color intensity, consistency)
   - Relevance: HIGH - Dye quality targets

3. **ai_insights** - AI recommendation storage
   - Primary key: id (UUID)
   - Need: Add dye optimization recommendations
   - Relevance: HIGH - ML optimization results

4. **prediction_kpis** - Model performance tracking
   - Primary key: id (UUID)
   - Need: Add dye-specific prediction metrics
   - Relevance: HIGH - Model validation

### DUPLICATE

1. **etp_decisions** vs **optimization_requests** - Process decision logging
   - Status: REDUNDANT - Need consolidation
   - Relevance: REDUNDANT - Same functionality

### NEW_REQUIRED

1. **fibers** - Fiber material catalog
   - Need: Yarn fiber properties and characteristics
   - Relevance: HIGH - Material composition

2. **fabrics** - Enhanced fabric catalog
   - Need: Enhanced properties for recipe matching
   - Status: Subset of fabric_details (extend)
   - Relevance: HIGH - Recipe foundation

3. **dyes** - Complete dye chemical database
   - Need: L*a*b* values, color fastness, chemical properties
   - Status: Missing - dye_machine_settings insufficient
   - Relevance: HIGH - Color science foundation

4. **chemicals** - Chemical properties catalog
   - Need: Safety data, handling requirements, compatibility
   - Status: Limited in chemical_dosing
   - Relevance: HIGH - Chemical management

5. **recipes** - Master dye recipes
   - Need: Structured recipe definitions
   - Status: Missing - optimized_recipes too basic
   - Relevance: HIGH - Core optimization asset

6. **recipe_dyes** - Recipe dye components
   - Need: Ingredient composition, ratios, compatibility
   - Status: Missing - component-level detail
   - Relevance: HIGH - Recipe granularity

7. **recipe_chemicals** - Recipe chemical components
   - Need: Chemical composition with quantities
   - Status: Missing - separate from chemical_dosing
   - Relevance: HIGH - Chemical recipe management

8. **recipe_process_parameters** - Process settings
   - Need: Temperature, time, ratio, pH targets
   - Status: Partially in dye_machine_settings
   - Relevance: HIGH - Process optimization

9. **target_shades** - Color target specification
   - Need: L*a*b* color targets, quality tolerances
   - Status: Missing - color standards
   - Relevance: HIGH - Quality control

10. **shade_results** - Actual vs target color measurements
    - Need: Color measurement history
    - Status: Missing - quality control data
    - Relevance: HIGH - Process optimization

11. **optimization_requests** - ML optimization requests
    - Need: AI-based recipe optimization tracking
    - Status: Partially in etp_decisions (need separate)
    - Relevance: HIGH - ML workflow

12. **optimization_results** - Optimization outputs
    - Need: Generated recipe results with scores
    - Status: Missing - results storage
    - Relevance: HIGH - Optimization tracking

13. **optimization_result_candidates** - Candidate recipes
    - Need: Generated recipe variants with scores
    - Status: Missing - candidate management
    - Relevance: HIGH - ML optimization workflow

14. **model_versions** - ML model registry
    - Need: AI model versions, performance metrics
    - Status: Partially in model_accuracy
    - Relevance: HIGH - ML lifecycle management

15. **prediction_logs** - Prediction audit trail
    - Need: AI prediction requests and responses
    - Status: Missing - ML workflow tracking
    - Relevance: HIGH - ML debugging and validation

### NOT_REQUIRED_YET

1. **analytics_filters**, **compliance_trends**, **environmental_metrics** - Already exist but broader scope than needed
2. **water_usage_series**, **savings_portfolio**, **control_center**, **export_formats**, **facility_segments**, **report_types**, **recent_reports** - Useful but different focus
3. **gateway_status**, **tank_levels**, **water_quality_trends** - Operational monitoring, not recipe optimization

## Summary

**Reusability Score:** 60% (15/25 relevant entities exist)

**Immediate Reuse:** 15 tables provide core infrastructure
**Extension Needed:** 2 tables need minor modifications
**New Required:** 15 tables needed for complete dye optimization
**Duplicate Eliminated:** 1 redundant table can be removed or consolidated

## Migration Priority

1. **Immediate:** Fiber, dyes, chemicals, recipes catalogs
2. **Short-term:** Process parameters, target shades, optimization workflow
3. **Long-term:** Advanced ML tracking (candidates, models, logs)

## Conflict Resolution

**Duplicate Resolution:** Consolidate `etp_decisions` → `optimization_requests` + retain existing ETP decisions separate

**Enhancement Strategy:** Extend existing tables (fabric_details → fabrics, etp_kpis → etp_dye_kpis) rather than creating parallel tables

**Integration Approach:** Use existing batch machine settings infrastructure for recipe process parameters

**Recommendation:** Focus on 12 high-priority new tables first, reuse 15 existing, extend 2 existing.