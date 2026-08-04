'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid, isPremiumActive } = require('./public-listings/query-helpers');
const { isValidKind, TABLE_BY_KIND } = require('./listing-refresh');
const { getPremiumPackage } = require('./premium-packages');

/** Premium slots included with Grow / Elite stay featured for 30 days. */
const PLAN_PREMIUM_PACKAGE_ID = 'plan-premium';
const PLAN_PREMIUM_DAYS = 30;

function premiumFieldsFromDoc(doc) {
  const until = doc?.premiumUntil ?? doc?.premium_until ?? null;
  const active = isPremiumActive(doc);
  return {
    isPremium: Boolean(active),
    premiumUntil: active && until ? new Date(until).toISOString() : null,
  };
}

async function createPremiumVoucher({
  userId,
  packageId,
  source,
  paymentId = null,
  priceEur = null,
  priceBc = null,
  days = null,
  status = 'unused',
}) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }

  let resolvedPackageId = packageId;
  let resolvedDays = days;
  let resolvedEur = priceEur;
  let resolvedBc = priceBc;

  if (source === 'subscription') {
    resolvedPackageId = PLAN_PREMIUM_PACKAGE_ID;
    resolvedDays = PLAN_PREMIUM_DAYS;
    resolvedEur = null;
    resolvedBc = null;
  } else {
    const pkg = getPremiumPackage(packageId);
    if (!pkg) {
      return { ok: false, status: 400, message: 'Paketa Premium nuk është e vlefshme.' };
    }
    resolvedPackageId = pkg.id;
    resolvedDays = pkg.days;
    if (resolvedEur == null) resolvedEur = pkg.priceEur;
    if (resolvedBc == null) resolvedBc = pkg.priceBc;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('premium_listing_vouchers')
    .insert({
      user_id: userId,
      package_id: resolvedPackageId,
      days: Number(resolvedDays) || PLAN_PREMIUM_DAYS,
      price_eur: resolvedEur != null ? Number(resolvedEur) : null,
      price_bc: resolvedBc != null ? Number(resolvedBc) : null,
      source,
      payment_id: paymentId,
      status,
    })
    .select('*')
    .single();
  if (error) throw error;

  return {
    ok: true,
    voucher: mapVoucher(data),
  };
}

function mapVoucher(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    packageId: row.package_id,
    days: Number(row.days) || 0,
    priceEur: row.price_eur != null ? Number(row.price_eur) : null,
    priceBc: row.price_bc != null ? Number(row.price_bc) : null,
    source: row.source,
    status: row.status,
    listingKind: row.listing_kind || null,
    listingId: row.listing_id ? String(row.listing_id) : null,
    appliedAt: row.applied_at || null,
    createdAt: row.created_at,
  };
}

async function listPremiumVouchers(userId, { unusedOnly = false } = {}) {
  const sb = getSupabaseAdmin();
  let q = sb
    .from('premium_listing_vouchers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (unusedOnly) q = q.eq('status', 'unused');
  const { data, error } = await q;
  if (error) {
    if (String(error.message || '').includes('premium_listing_vouchers')) return [];
    throw error;
  }
  return (data || []).map(mapVoucher);
}

async function purchasePremiumWithBoostCoins({ userId, packageId }) {
  const pkg = getPremiumPackage(packageId);
  if (!pkg) {
    return { ok: false, status: 400, message: 'Paketa Premium nuk është e vlefshme.' };
  }
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }

  const sb = getSupabaseAdmin();
  const cost = pkg.priceBc;
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) {
    return { ok: false, status: 401, message: 'Profili nuk u gjet.' };
  }

  const balance = Number(profile.boost_credits) || 0;
  if (balance < cost) {
    return {
      ok: false,
      status: 400,
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
    };
  }

  const now = new Date().toISOString();
  const { data: spent, error: spendErr } = await sb
    .from('profiles')
    .update({ boost_credits: balance - cost, updated_at: now })
    .eq('id', userId)
    .gte('boost_credits', cost)
    .select('boost_credits')
    .maybeSingle();
  if (spendErr) throw spendErr;
  if (!spent) {
    return {
      ok: false,
      status: 400,
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
    };
  }

  try {
    const created = await createPremiumVoucher({
      userId,
      packageId: pkg.id,
      source: 'boost_coins',
      priceBc: cost,
      priceEur: pkg.priceEur,
    });
    if (!created.ok) {
      await sb
        .from('profiles')
        .update({ boost_credits: balance, updated_at: new Date().toISOString() })
        .eq('id', userId);
      return created;
    }
    return {
      ok: true,
      voucher: created.voucher,
      boostCredits: Number(spent.boost_credits) || 0,
      cost,
    };
  } catch (err) {
    await sb
      .from('profiles')
      .update({ boost_credits: balance, updated_at: new Date().toISOString() })
      .eq('id', userId);
    throw err;
  }
}

async function loadOwnedApprovedListing(sb, { userId, kind, listingId }) {
  const table = TABLE_BY_KIND[kind];
  let listingQ = sb.from(table).select('id, poster_id, status, premium_until').eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    listingQ = listingQ.eq('vertical', kind);
  }
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) {
    if (String(listingErr.message || '').includes('premium_until')) {
      return {
        ok: false,
        status: 503,
        message: 'Skema Premium nuk është gati. Aplikoni migrimin e databazës.',
      };
    }
    throw listingErr;
  }
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të aplikoni Premium në këtë njoftim.' };
  }
  if (String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të bëhen Premium.',
    };
  }
  return { ok: true, listing, table };
}

function computePremiumUntil(listing, days) {
  const now = new Date();
  const base =
    listing.premium_until && new Date(listing.premium_until) > now
      ? new Date(listing.premium_until)
      : now;
  const until = new Date(base);
  until.setDate(until.getDate() + Math.max(1, Number(days) || 0));
  return { now, until };
}

async function bumpListingPremium(sb, table, listingId, until, now) {
  const { error: bumpErr } = await sb
    .from(table)
    .update({
      premium_until: until.toISOString(),
      // Keep Premium listings near the top of "newest" within the featured group.
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', listingId);
  if (bumpErr) throw bumpErr;
}

async function getActiveSubscriptionPremiumMax(userId) {
  const sb = getSupabaseAdmin();
  const now = new Date();
  const { data, error } = await sb
    .from('user_subscriptions')
    .select('max_premium_listings, status, expires_at, price_eur')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const active = (data || []).find(
    (s) =>
      s.status === 'active' &&
      Number(s.price_eur) > 0 &&
      (!s.expires_at || new Date(s.expires_at) >= now),
  );
  return Number(active?.max_premium_listings) || 0;
}

async function listingStillPremium(sb, kind, listingId) {
  const table = TABLE_BY_KIND[kind];
  if (!table || !listingId) return false;
  let q = sb.from(table).select('premium_until').eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    q = q.eq('vertical', kind);
  }
  const { data, error } = await q.maybeSingle();
  if (error) {
    if (String(error.message || '').includes('premium_until')) return false;
    throw error;
  }
  return isPremiumActive(data);
}

async function countActivePlanPremiumSlots(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('premium_listing_vouchers')
    .select('listing_kind, listing_id')
    .eq('user_id', userId)
    .eq('source', 'subscription')
    .eq('status', 'applied');
  if (error) {
    if (String(error.message || '').includes('premium_listing_vouchers')) return 0;
    throw error;
  }

  const seen = new Set();
  let used = 0;
  for (const row of data || []) {
    const kind = row.listing_kind;
    const listingId = row.listing_id ? String(row.listing_id) : '';
    if (!isValidKind(kind) || !listingId) continue;
    const key = `${kind}:${listingId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (await listingStillPremium(sb, kind, listingId)) used += 1;
  }
  return used;
}

async function getPremiumQuotaSnapshot(userId) {
  const [max, used] = await Promise.all([
    getActiveSubscriptionPremiumMax(userId),
    countActivePlanPremiumSlots(userId),
  ]);
  return {
    max,
    used,
    remaining: Math.max(0, max - used),
    days: PLAN_PREMIUM_DAYS,
  };
}

async function findActivePlanPremiumVoucher(sb, userId, kind, listingId) {
  const { data, error } = await sb
    .from('premium_listing_vouchers')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'subscription')
    .eq('status', 'applied')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .order('applied_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data || [])[0] || null;
}

async function applyPremiumVoucher({ userId, voucherId, kind, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isUuid(String(voucherId || ''))) {
    return { ok: false, status: 400, message: 'Voucher i pavlefshëm.' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const sb = getSupabaseAdmin();
  const { data: voucher, error: vErr } = await sb
    .from('premium_listing_vouchers')
    .select('*')
    .eq('id', voucherId)
    .eq('user_id', userId)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!voucher) {
    return { ok: false, status: 404, message: 'Voucher-i nuk u gjet.' };
  }
  if (voucher.status !== 'unused') {
    return { ok: false, status: 400, message: 'Ky voucher është përdorur tashmë.' };
  }

  const loaded = await loadOwnedApprovedListing(sb, { userId, kind, listingId });
  if (!loaded.ok) return loaded;

  const days = Number(voucher.days) || 0;
  const { now, until } = computePremiumUntil(loaded.listing, days);
  await bumpListingPremium(sb, loaded.table, listingId, until, now);

  const { data: applied, error: applyErr } = await sb
    .from('premium_listing_vouchers')
    .update({
      status: 'applied',
      listing_kind: kind,
      listing_id: listingId,
      applied_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', voucherId)
    .eq('status', 'unused')
    .select('*')
    .maybeSingle();
  if (applyErr) throw applyErr;
  if (!applied) {
    return { ok: false, status: 400, message: 'Ky voucher është përdorur tashmë.' };
  }

  return {
    ok: true,
    voucher: mapVoucher(applied),
    premiumUntil: until.toISOString(),
  };
}

/**
 * Spend one Grow/Elite Premium Listing slot: feature the post for 30 days.
 */
async function applyPremiumFromPlan({ userId, kind, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const sb = getSupabaseAdmin();
  const loaded = await loadOwnedApprovedListing(sb, { userId, kind, listingId });
  if (!loaded.ok) return loaded;

  const existing = await findActivePlanPremiumVoucher(sb, userId, kind, listingId);
  if (existing && isPremiumActive(loaded.listing)) {
    return {
      ok: true,
      alreadyActive: true,
      voucher: mapVoucher(existing),
      premiumUntil: new Date(loaded.listing.premium_until).toISOString(),
      quota: await getPremiumQuotaSnapshot(userId),
    };
  }

  const quota = await getPremiumQuotaSnapshot(userId);
  if (quota.max <= 0) {
    return {
      ok: false,
      status: 400,
      message:
        'Paketa juaj nuk përfshin Premium Listing. Upgrade në Grow/Elite ose blini një paketë ekstra.',
    };
  }
  if (quota.remaining <= 0) {
    return {
      ok: false,
      status: 400,
      message: `Keni përdorur të gjitha vendet Premium të paketës (${quota.used}/${quota.max}).`,
    };
  }

  const { now, until } = computePremiumUntil(loaded.listing, PLAN_PREMIUM_DAYS);
  await bumpListingPremium(sb, loaded.table, listingId, until, now);

  const { data: voucherRow, error: insErr } = await sb
    .from('premium_listing_vouchers')
    .insert({
      user_id: userId,
      package_id: PLAN_PREMIUM_PACKAGE_ID,
      days: PLAN_PREMIUM_DAYS,
      price_eur: null,
      price_bc: null,
      source: 'subscription',
      payment_id: null,
      status: 'applied',
      listing_kind: kind,
      listing_id: listingId,
      applied_at: now.toISOString(),
    })
    .select('*')
    .single();
  if (insErr) {
    if (/premium_listing_vouchers_source_check|subscription/i.test(String(insErr.message || ''))) {
      return {
        ok: false,
        status: 503,
        message:
          'Skema Premium për paketat nuk është gati. Aplikoni migrimin 20260802020000_premium_subscription_source.sql.',
      };
    }
    throw insErr;
  }

  return {
    ok: true,
    voucher: mapVoucher(voucherRow),
    premiumUntil: until.toISOString(),
    quota: await getPremiumQuotaSnapshot(userId),
  };
}

module.exports = {
  PLAN_PREMIUM_DAYS,
  PLAN_PREMIUM_PACKAGE_ID,
  premiumFieldsFromDoc,
  createPremiumVoucher,
  listPremiumVouchers,
  purchasePremiumWithBoostCoins,
  applyPremiumVoucher,
  applyPremiumFromPlan,
  getPremiumQuotaSnapshot,
  mapVoucher,
};
