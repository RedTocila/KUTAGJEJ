'use strict';

const { getSupabaseAdmin } = require('./supabase');
const {
  isUuid,
  isPremiumActive,
  isOkazionActive,
} = require('./public-listings/query-helpers');
const { refreshHoursForPlanCode } = require('./auto-refresh-packages');
const { applyListingBump } = require('./listing-bump');

const REFRESH_COST_FREE = 1;
const REFRESH_COST_PREMIUM = 5;
const REFRESH_COST_OKAZION = 10;
/** @deprecated use tier helpers — kept for callers expecting a default */
const REFRESH_COST = REFRESH_COST_FREE;

function refreshCostForListing(listing) {
  if (isOkazionActive(listing)) return REFRESH_COST_OKAZION;
  if (isPremiumActive(listing)) return REFRESH_COST_PREMIUM;
  return REFRESH_COST_FREE;
}

function insufficientRefreshCreditsMessage(cost) {
  return `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`;
}

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

function resolvePlanCode(sub) {
  if (!sub) return 'free';
  const code = String(sub.plan_code || '').trim().toLowerCase();
  if (code && code !== 'free') return code;
  const title = String(sub.contract_title || '').toLowerCase();
  if (title.includes('elite')) return 'elite';
  if (title.includes('grow')) return 'grow';
  if (title.includes('starter')) return 'starter';
  if (code) return code;
  return 'free';
}

async function getRefreshWindowHours(sb, userId) {
  const now = new Date();
  const { data, error } = await sb
    .from('user_subscriptions')
    .select('plan_code, contract_title, refresh_every_hours, status, expires_at, price_eur')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const active =
    (data || []).find(
      (s) =>
        s.status === 'active' &&
        Number(s.price_eur) > 0 &&
        (!s.expires_at || new Date(s.expires_at) >= now),
    ) || null;

  if (active?.refresh_every_hours != null && Number(active.refresh_every_hours) > 0) {
    return Number(active.refresh_every_hours);
  }
  const planCode = resolvePlanCode(active);
  return refreshHoursForPlanCode(planCode);
}

/**
 * Spend boost credits to bump a listing within its tier (free / Premium / OKAZION)
 * by setting bumped_at to now — public "newest" sort uses bumped_at per tier.
 * Cost: 1 BC free, 5 BC active Premium, 10 BC active OKAZION.
 * Does not rewrite created_at (publish date / job expiry) or engagement metrics.
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

  const selectCols = ['id', 'poster_id', 'status', 'created_at', 'premium_until'];
  if (kind !== 'businesses' && kind !== 'professionals') {
    selectCols.push('okazion_until');
  }

  let listingQ = sb.from(table).select(selectCols.join(', ')).eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    listingQ = listingQ.eq('vertical', kind);
  }
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund ta ngreni këtë njoftim në krye.' };
  }
  if (String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të ngrihen në krye.',
    };
  }

  const refreshEveryHours = await getRefreshWindowHours(sb, userId);
  const { data: refreshMeta, error: refreshMetaErr } = await sb
    .from('listing_auto_refresh')
    .select('last_refreshed_at, enabled')
    .eq('user_id', userId)
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (refreshMetaErr) {
    if (!String(refreshMetaErr.message || '').includes('listing_auto_refresh')) {
      throw refreshMetaErr;
    }
  }
  const lastRefreshMs = refreshMeta?.last_refreshed_at
    ? new Date(refreshMeta.last_refreshed_at).getTime()
    : NaN;
  if (Number.isFinite(lastRefreshMs) && refreshEveryHours > 0) {
    const nowMs = Date.now();
    const elapsedMs = nowMs - lastRefreshMs;
    const requiredMs = refreshEveryHours * 60 * 60 * 1000;
    if (elapsedMs < requiredMs) {
      const remainingMs = requiredMs - elapsedMs;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      const remainingHours = Math.ceil(remainingMinutes / 60);
      return {
        ok: false,
        status: 400,
        message: `Mund ta ngreni në krye pas ${remainingHours} ore${
          remainingHours === 1 ? '' : 'sh'
        }.`,
      };
    }
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

  const refreshCost = refreshCostForListing(listing);
  const balance = Number(profile.boost_credits) || 0;
  if (balance < refreshCost) {
    return {
      ok: false,
      status: 400,
      message: insufficientRefreshCreditsMessage(refreshCost),
    };
  }

  const now = new Date().toISOString();
  const { data: spent, error: spendErr } = await sb
    .from('profiles')
    .update({ boost_credits: balance - refreshCost, updated_at: now })
    .eq('id', userId)
    .gte('boost_credits', refreshCost)
    .select('boost_credits')
    .maybeSingle();
  if (spendErr) throw spendErr;
  if (!spent) {
    return {
      ok: false,
      status: 400,
      message: insufficientRefreshCreditsMessage(refreshCost),
    };
  }

  // Bump public “newest” sort only via bumped_at. Leave created_at (publish /
  // job expiry) and updated_at (My listings order) alone. Never touch
  // listing_engagements, saved_listings, or reviews.
  try {
    await applyListingBump(sb, table, listingId, {}, now);
  } catch (bumpErr) {
    // Best-effort refund if bump fails after debit.
    await sb
      .from('profiles')
      .update({ boost_credits: balance, updated_at: new Date().toISOString() })
      .eq('id', userId);
    throw bumpErr;
  }

  // Persist manual refresh anchor so cooldown applies per listing (not global / created_at).
  try {
    await sb.from('listing_auto_refresh').upsert(
      {
        user_id: userId,
        listing_kind: kind,
        listing_id: listingId,
        enabled: Boolean(refreshMeta?.enabled),
        last_refreshed_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id,listing_kind,listing_id' },
    );
  } catch (metaErr) {
    if (!String(metaErr?.message || '').includes('listing_auto_refresh')) {
      throw metaErr;
    }
  }

  return {
    ok: true,
    refreshedAt: now,
    boostCredits: Number(spent.boost_credits) || 0,
    cost: refreshCost,
  };
}

module.exports = {
  REFRESH_COST,
  REFRESH_COST_FREE,
  REFRESH_COST_PREMIUM,
  REFRESH_COST_OKAZION,
  refreshCostForListing,
  insufficientRefreshCreditsMessage,
  refreshListingWithBoost,
  getRefreshWindowHours,
  isValidKind,
  TABLE_BY_KIND,
};
