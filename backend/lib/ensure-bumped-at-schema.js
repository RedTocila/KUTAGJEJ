'use strict';

const { getSupabaseAdmin } = require('./supabase');

/** @type {boolean | null} null = not probed yet */
let bumpedAtReady = null;

/** true / false after probe; null before probe. */
function hasBumpedAtColumn() {
  return bumpedAtReady;
}

/**
 * Probe whether listing tables expose `bumped_at`.
 * Until the migration is applied, sort/bump fall back to `created_at`.
 */
async function ensureBumpedAtSchema() {
  const sb = getSupabaseAdmin();
  const { error: colErr } = await sb.from('real_estate_listings').select('bumped_at').limit(1);
  if (colErr && /bumped_at/i.test(String(colErr.message || ''))) {
    bumpedAtReady = false;
    console.warn(
      '[bump] Missing bumped_at on listing tables. ' +
        'Apply supabase/migrations/20260810140000_listing_bumped_at.sql ' +
        '(or backend/scripts/repair-missing-schema.sql).',
    );
    return;
  }
  if (colErr) {
    bumpedAtReady = false;
    console.warn('[bump] Could not probe bumped_at:', colErr.message);
    return;
  }
  bumpedAtReady = true;
}

module.exports = { ensureBumpedAtSchema, hasBumpedAtColumn };
