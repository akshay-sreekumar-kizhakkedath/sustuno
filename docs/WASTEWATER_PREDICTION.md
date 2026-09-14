# SUSTUNO — Wastewater Profile Prediction

## Overview
Predicts expected effluent water profile (COD, BOD, TDS, pH, EC, turbidity, color, flow) based on recipe and process parameters.

## Current Status
- **Status**: `DATA-DEPENDENT` / `NOT_AVAILABLE`
- **Behavior**: Returns `prediction_status: "not_available"` with `null` predicted coordinates whenever no validated ML model artifact exists.
- **Physical Sensors**: `OUT_OF_SCOPE` (No physical hardware telemetry).
