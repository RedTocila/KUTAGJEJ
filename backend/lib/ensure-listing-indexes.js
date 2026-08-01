/**
 * MongoDB listing indexes are not needed with Supabase/Postgres.
 * Kept as a no-op so startup hooks keep working.
 */
async function ensureListingIndexes() {
  return Promise.resolve();
}

module.exports = { ensureListingIndexes };
