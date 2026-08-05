'use strict';

const { getSupabaseAdmin } = require('./supabase');

async function ensureOkazionListingSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('okazion_listing_vouchers').select('id').limit(1);
  if (!error) return;
  console.warn(
    '[okazion] Missing okazion_listing_vouchers (and/or okazion_until columns). ' +
      'Apply supabase/migrations/20260805140000_okazion_listings.sql.',
  );
}

module.exports = { ensureOkazionListingSchema };
