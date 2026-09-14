# SUSTUNO — Backend API Reference

> Status: IMPLEMENTED. New in this phase: GET /api/ml/status, POST /api/ml/predict-shade, GET /api/ml/dye-dataset/readiness, GET /api/dye-batches/:id/intelligence, GET /api/dye-batches/:id/comparison. IoT telemetry endpoints are OUT_OF_SCOPE; treated-water reuse loop is FUTURE_SCOPE.


## Standard API Response Format

```json
// Success Response
{
  "success": true,
  "data": {}
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": []
  }
}
```

## Core Endpoint Directory

### Dye Optimization
- `POST /api/optimization/dye-recipe`: Execute recipe optimization request
- `GET /api/optimization/dye-recipe/:id`: Retrieve optimization session

### Dye Batch Intelligence
- `POST /api/dye-batches`: Create planned batch record
- `GET /api/dye-batches/:id`: Retrieve batch details
- `PUT /api/dye-batches/:id`: Update actual process parameters
- `POST /api/dye-batches/:id/shade-result`: Record measured $L^*a^*b^*$ result
- `GET /api/dye-batches/:id/training-readiness`: Check batch readiness

### Machine Learning
- `GET /api/ml/dye-dataset/readiness`: Aggregate dataset training readiness

### Wastewater Profile
- `POST /api/wastewater/predict`: Predict expected wastewater profile
- `GET /api/wastewater/batches/:id`: Fetch batch wastewater profile

### ETP Decision Support
- `POST /api/etp/recommend`: Generate advisory ETP recommendations & dosing
- `GET /api/etp/rules`: List evaluated domain rules

### Production, Overview, Analytics & Reports
- `GET /api/production/batches`: List production batches
- `GET /api/production/summary`: Production summary metrics
- `GET /api/overview/kpis`: System status KPIs
- `GET /api/analytics/summary`: Aggregate process analytics
- `POST /api/reports/generate`: Generate auditable report object
- `GET /api/reports/list`: List historical reports



### Structured Dye Optimizer contract (2026-09-14)
- `GET /api/reference/fabrics|fibers|dye-classes?fabric_id|machines|recipe-resources?recipe_id`: validated dropdown sources (standard recipes + KB machine records).
- `POST /api/optimization/dye-recipe` accepts structured {material, target_shade, dye_class, machine, process} plus the legacy flat shape. Validation failures return 400 {code: INVALID_REQUEST, details:[{code,message,field}]}.
- Result carries model_tier (validated_model | demo_synthetic | model_unavailable), request_status, delta_e_interpretation='threshold not configured'. Status completed | partial | failed (never bare success).

