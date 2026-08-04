'use strict';

const { getSupabaseAdmin } = require('./supabase');

/**
 * Best-effort schema check so local/prod DBs that only ran the old init
 * get a clear warning until `20260802010000_auto_refresh_slots.sql` is applied.
 */
async function ensureAutoRefreshSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('profiles').select('auto_refresh_slots').limit(1);
  if (!error) return;
  console.warn(
    '[auto-refresh] Missing profiles.auto_refresh_slots (and/or listing_auto_refresh). ' +
      'Apply supabase/migrations/20260802010000_auto_refresh_slots.sql before selling packs.',
  );
}

module.exports = { ensureAutoRefreshSchema };
