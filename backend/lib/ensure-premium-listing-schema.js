'use strict';

const { getSupabaseAdmin } = require('./supabase');

let premiumUntilReady = null;

function hasPremiumUntilColumn() {
  return premiumUntilReady === true;
}

/**
 * Probe whether listing tables expose `premium_until`.
 * After a wipe that re-ran init.sql, vouchers can exist while listing columns do not.
 */
async function ensurePremiumListingSchema() {
  const sb = getSupabaseAdmin();

  const { error: vouchersErr } = await sb.from('premium_listing_vouchers').select('id').limit(1);
  if (vouchersErr) {
    premiumUntilReady = false;
    console.warn(
      '[premium] Missing premium_listing_vouchers. ' +
        'Apply supabase/migrations/20260802013000_premium_listing_vouchers.sql.',
    );
    return;
  }

  const { error: colErr } = await sb.from('real_estate_listings').select('premium_until').limit(1);
  if (colErr && /premium_until/i.test(String(colErr.message || ''))) {
    premiumUntilReady = false;
    console.warn(
      '[premium] Missing premium_until on listing tables. ' +
        'Apply supabase/migrations/20260802013000_premium_listing_vouchers.sql ' +
        '(or backend/scripts/repair-missing-schema.sql).',
    );
    return;
  }

  premiumUntilReady = true;
}

module.exports = { ensurePremiumListingSchema, hasPremiumUntilColumn };
