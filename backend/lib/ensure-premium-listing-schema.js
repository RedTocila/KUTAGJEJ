'use strict';

const { getSupabaseAdmin } = require('./supabase');

async function ensurePremiumListingSchema() {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from('premium_listing_vouchers').select('id').limit(1);
  if (!error) return;
  console.warn(
    '[premium] Missing premium_listing_vouchers (and/or premium_until columns). ' +
      'Apply supabase/migrations/20260802013000_premium_listing_vouchers.sql.',
  );
}

module.exports = { ensurePremiumListingSchema };
