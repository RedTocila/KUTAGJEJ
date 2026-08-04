'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const REFRESH_COST = 1;

const TABLE_BY_KIND = {
  'real-estate': 'real_estate_listings',
  car: 'car_listings',
  job: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
};

function isValidKind(kind) {
  return Boolean(TABLE_BY_KIND[kind]);
}

/**
 * Spend 1 boost credit to bump a listing to the top of its category
 * by setting created_at (and updated_at) to now — public "newest" sort uses created_at.
 */
async function refreshListingWithBoost({ userId, kind, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const table = TABLE_BY_KIND[kind];
  const sb = getSupabaseAdmin();

  let listingQ = sb.from(table).select('id, poster_id, status').eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    listingQ = listingQ.eq('vertical', kind);
  }
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të rifreskoni këtë njoftim.' };
  }
  if (String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të rifreskohen.',
    };
  }

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('id, boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile) {
    return { ok: false, status: 401, message: 'Profili nuk u gjet.' };
  }

  const balance = Number(profile.boost_credits) || 0;
  if (balance < REFRESH_COST) {
    return {
      ok: false,
      status: 400,
      message: 'Nuk keni mjaftueshëm Boost Coins. Duhet 1 BC për rifreskim.',
    };
  }

  const now = new Date().toISOString();
  const { data: spent, error: spendErr } = await sb
    .from('profiles')
    .update({ boost_credits: balance - REFRESH_COST, updated_at: now })
    .eq('id', userId)
    .gte('boost_credits', REFRESH_COST)
    .select('boost_credits')
    .maybeSingle();
  if (spendErr) throw spendErr;
  if (!spent) {
    return {
      ok: false,
      status: 400,
      message: 'Nuk keni mjaftueshëm Boost Coins. Duhet 1 BC për rifreskim.',
    };
  }

  const { error: bumpErr } = await sb
    .from(table)
    .update({ created_at: now, updated_at: now })
    .eq('id', listingId);
  if (bumpErr) {
    // Best-effort refund if bump fails after debit.
    await sb
      .from('profiles')
      .update({ boost_credits: balance, updated_at: new Date().toISOString() })
      .eq('id', userId);
    throw bumpErr;
  }

  return {
    ok: true,
    refreshedAt: now,
    boostCredits: Number(spent.boost_credits) || 0,
    cost: REFRESH_COST,
  };
}

module.exports = {
  REFRESH_COST,
  refreshListingWithBoost,
  isValidKind,
  TABLE_BY_KIND,
};
