// Schema guard: the live Supabase project may not yet have the dye batch tables
// (migration 004 pending). Detect PostgREST "table not found" and let callers
// return honest empty/insufficient states instead of obscure 500s.
function isMissingTableError(err) {
  if (!err) return false;
  if (err.code === 'PGRST205') return true;
  return /could not find the table/i.test(err.message || '');
}

const NOT_PROVISIONED_NOTE = 'Dye batch tables are not yet provisioned in the live database. ' +
  'Apply database/migrations/004_provision_dye_batch_tables.sql via the Supabase SQL editor.';

function notProvisionedPayload() {
  return { provisioned: false, note: NOT_PROVISIONED_NOTE };
}

module.exports = { isMissingTableError, notProvisionedPayload, NOT_PROVISIONED_NOTE };
