/**
 * MongoDB moderation index backfill is not needed with Supabase/Postgres.
 * Kept as a no-op so startup hooks keep working.
 */
async function ensureListingModeration() {
  return Promise.resolve();
}

module.exports = { ensureListingModeration };
