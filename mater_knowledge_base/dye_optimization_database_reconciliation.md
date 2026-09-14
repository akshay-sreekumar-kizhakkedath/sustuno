# Dye Optimization Database Reconciliation

This document explains how the dye optimization database tables relate to the existing knowledge base and application data.

## Existing Knowledge Base

The knowledge base (master_knowledge_base.json and q
ule_base.json) contains:

- Recipe records (domain: recipe)
- ETP rules (domain: etp)
- Machine facts
- Chemical compatibility data
- etc.

## Dye Optimization Tables

The new dye optimization tables are designed to store runtime optimization data, not static knowledge.

### How They Relate

1. **Inputs**: The dye optimization inputs may reference knowledge base records, such as:
   - Fabric type from knowledge base (domain: recipe, subject: fabric type)
   - Dye class from knowledge base (domain: recipe, subject: dye class)
   - Machine constraints from knowledge base (domain: machine)

2. **Outputs**: The optimized recipe recommendations can be linked to knowledge base recipes for validation or display.

3. **Constraints**: Optimization constraints may be derived from knowledge base limits, such as:
   - Chemical dosage limits
   - Temperature ranges
   - pH constraints

### Relationship to Existing Tables

The dye optimization sessions can be associated with existing batches via the atch_id foreign key to the atches table.

This allows optimization runs to be tied to specific production batches, enabling traceability.

## Data Flow

1. User selects a batch and optimization parameters (inputs).
2. Inputs are stored in dye_opt_inputs.
3. Optimization engine runs (could be external service or ML model).
4. Results are stored in dye_opt_outputs and dye_opt_constraints.
5. Frontend retrieves recommendations and displays them, possibly enriching with knowledge base data.

## Note

The knowledge base remains unchanged and continues to serve as the source of truth for textile dyeing rules and recipes. The dye optimization tables store transient optimization session data and results.

