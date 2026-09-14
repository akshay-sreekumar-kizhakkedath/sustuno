# Dye Batch Data Collection Template

Record one sheet per dyeing experiment / batch.

## REQUIRED (training-ready only if present)
- batch_id
- fiber_composition
- fabric_type
- gsm
- fabric_weight_kg
- dye_class
- dye IDs + planned % OWF / actual % OWF
- chemical IDs + planned dosage / actual dosage
- machine
- liquor_ratio (actual)
- temperature (actual)
- time_minutes (actual)
- pH (actual)
- target_L, target_a, target_b
- measured_L, measured_a, measured_b
- measurement_date
- measurement_instrument
- data_source = real_batch (not synthetic/reference)

## RECOMMENDED
- optimization_id (if from SUSTUNO)
- recipe_id
- batch_date
- operator/user
- heating/cooling profile notes
- measurement_method
- measurement_operator
- sample_identifier
- measurement_temperature
- shade_name / shade_code
- addition_stage per chemical
- actual_quantity_kg per dye and chemical

## OPTIONAL
- customer_reference
- end_use
- notes
- measurement_notes
- duplicate measurement replicates (measure 1 / 2 / 3)

## DATA QUALITY RULES
- status must not be 'draft' or 'incomplete' to be training-ready.
- If measured_L / a / b missing → training_ready = false.
- If recipe inputs missing → training_ready = false.
- If process actuals missing → training_ready = false (recommended, not always required depending on data quality policy).
- Reference recipes without measured Lab → NOT training-ready.
- Synthetic values must be marked data_source = synthetic and excluded from real model training.
