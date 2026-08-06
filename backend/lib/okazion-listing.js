'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid, isPremiumActive } = require('./public-listings/query-helpers');
const { isValidKind, TABLE_BY_KIND } = require('./listing-refresh');
const { getOkazionPackage } = require('./okazion-packages');

/** OKAZION slots included with Grow / Elite stay featured for 5 days. */
const PLAN_OKAZION_PACKAGE_ID = 'plan-okazion';
const PLAN_OKAZION_DAYS = 5;

function isOkazionActive(doc) {
  if (!doc) return false;
  const raw = doc.okazionUntil ?? doc.okazion_until ?? null;
  if (!raw) return false;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

function okazionFieldsFromDoc(doc) {
  const until = doc?.okazionUntil ?? doc?.okazion_until ?? null;
  const active = isOkazionActive(doc);
  return {
    isOkazion: Boolean(active),
    okazionUntil: active && until ? new Date(until).toISOString() : null,
  };
}

async function createOkazionVoucher({
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
    resolvedPackageId = PLAN_OKAZION_PACKAGE_ID;
    resolvedDays = PLAN_OKAZION_DAYS;
    resolvedEur = null;
    resolvedBc = null;
  } else {
    const pkg = getOkazionPackage(packageId);
    if (!pkg) {
      return { ok: false, status: 400, message: 'Paketa OKAZION nuk është e vlefshme.' };
    }
    resolvedPackageId = pkg.id;
    resolvedDays = pkg.days;
    if (resolvedEur == null) resolvedEur = pkg.priceEur;
    if (resolvedBc == null) resolvedBc = pkg.priceBc;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('okazion_listing_vouchers')
    .insert({
      user_id: userId,
      package_id: resolvedPackageId,
      days: Number(resolvedDays) || PLAN_OKAZION_DAYS,
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

async function listOkazionVouchers(userId, { unusedOnly = false } = {}) {
  const sb = getSupabaseAdmin();
  let q = sb
    .from('okazion_listing_vouchers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (unusedOnly) q = q.eq('status', 'unused');
  const { data, error } = await q;
  if (error) {
    if (String(error.message || '').includes('okazion_listing_vouchers')) return [];
    throw error;
  }
  return (data || []).map(mapVoucher);
}

function clampQuantity(raw) {
  const n = Math.floor(Number(raw) || 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(50, n);
}

async function purchaseOkazionWithBoostCoins({ userId, packageId, quantity = 1 }) {
  const pkg = getOkazionPackage(packageId);
  if (!pkg) {
    return { ok: false, status: 400, message: 'Paketa OKAZION nuk është e vlefshme.' };
  }
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }

  const qty = clampQuantity(quantity);
  const sb = getSupabaseAdmin();
  const cost = pkg.priceBc * qty;
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

  const vouchers = [];
  const createdIds = [];
  try {
    for (let i = 0; i < qty; i += 1) {
      const created = await createOkazionVoucher({
        userId,
        packageId: pkg.id,
        source: 'boost_coins',
        priceBc: pkg.priceBc,
        priceEur: pkg.priceEur,
      });
      if (!created.ok) {
        if (createdIds.length) {
          await sb.from('okazion_listing_vouchers').delete().in('id', createdIds);
        }
        await sb
          .from('profiles')
          .update({ boost_credits: balance, updated_at: new Date().toISOString() })
          .eq('id', userId);
        return created;
      }
      if (created.voucher?.id) createdIds.push(created.voucher.id);
      vouchers.push(created.voucher);
    }
    return {
      ok: true,
      voucher: vouchers[0] || null,
      vouchers,
      quantity: qty,
      boostCredits: Number(spent.boost_credits) || 0,
      cost,
    };
  } catch (err) {
    if (createdIds.length) {
      try {
        await sb.from('okazion_listing_vouchers').delete().in('id', createdIds);
      } catch {
        /* best-effort rollback */
      }
    }
    await sb
      .from('profiles')
      .update({ boost_credits: balance, updated_at: new Date().toISOString() })
      .eq('id', userId);
    throw err;
  }
}

async function loadOwnedApprovedListing(sb, { userId, kind, listingId }) {
  if (kind === 'businesses' || kind === 'professionals') {
    return {
      ok: false,
      status: 400,
      message: 'OKAZION nuk ofrohet për biznese ose profesionistë.',
    };
  }
  const table = TABLE_BY_KIND[kind];
  let listingQ = sb
    .from(table)
    .select('id, poster_id, status, okazion_until, premium_until')
    .eq('id', listingId);
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) {
    if (String(listingErr.message || '').includes('okazion_until')) {
      return {
        ok: false,
        status: 503,
        message: 'Skema OKAZION nuk është gati. Aplikoni migrimin e databazës.',
      };
    }
    throw listingErr;
  }
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të aplikoni OKAZION në këtë njoftim.' };
  }
  if (String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të bëhen OKAZION.',
    };
  }
  if (isPremiumActive(listing)) {
    return {
      ok: false,
      status: 400,
      message: 'Ky njoftim është Premium aktiv. Nuk mund të bëhet OKAZION derisa të mbarojë Premium.',
    };
  }
  return { ok: true, listing, table };
}

function computeOkazionUntil(listing, days) {
  const now = new Date();
  const base =
    listing.okazion_until && new Date(listing.okazion_until) > now
      ? new Date(listing.okazion_until)
      : now;
  const until = new Date(base);
  until.setDate(until.getDate() + Math.max(1, Number(days) || 0));
  return { now, until };
}

async function bumpListingOkazion(sb, table, listingId, until, now) {
  const { error: bumpErr } = await sb
    .from(table)
    .update({
      okazion_until: until.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', listingId);
  if (bumpErr) throw bumpErr;
}

async function markRefreshAnchor(sb, { userId, kind, listingId, refreshedAt }) {
  try {
    await sb.from('listing_auto_refresh').upsert(
      {
        user_id: userId,
        listing_kind: kind,
        listing_id: listingId,
        last_refreshed_at: refreshedAt,
        updated_at: refreshedAt,
      },
      { onConflict: 'user_id,listing_kind,listing_id' },
    );
  } catch (error) {
    if (!String(error?.message || '').includes('listing_auto_refresh')) throw error;
  }
}

async function getActiveSubscriptionOkazionMax(userId) {
  const sb = getSupabaseAdmin();
  const now = new Date();
  const { data, error } = await sb
    .from('user_subscriptions')
    .select('max_okazion_listings, status, expires_at, price_eur')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    if (/max_okazion_listings/i.test(String(error.message || ''))) return 0;
    throw error;
  }
  const active = (data || []).find(
    (s) =>
      s.status === 'active' &&
      Number(s.price_eur) > 0 &&
      (!s.expires_at || new Date(s.expires_at) >= now),
  );
  return Number(active?.max_okazion_listings) || 0;
}

async function listingStillOkazion(sb, kind, listingId) {
  if (kind === 'businesses' || kind === 'professionals') return false;
  const table = TABLE_BY_KIND[kind];
  if (!table || !listingId) return false;
  const q = sb.from(table).select('okazion_until').eq('id', listingId);
  const { data, error } = await q.maybeSingle();
  if (error) {
    if (String(error.message || '').includes('okazion_until')) return false;
    throw error;
  }
  return isOkazionActive(data);
}

async function countActivePlanOkazionSlots(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('okazion_listing_vouchers')
    .select('listing_kind, listing_id')
    .eq('user_id', userId)
    .eq('source', 'subscription')
    .eq('status', 'applied');
  if (error) {
    if (String(error.message || '').includes('okazion_listing_vouchers')) return 0;
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
    if (await listingStillOkazion(sb, kind, listingId)) used += 1;
  }
  return used;
}

async function getOkazionQuotaSnapshot(userId) {
  const [max, used] = await Promise.all([
    getActiveSubscriptionOkazionMax(userId),
    countActivePlanOkazionSlots(userId),
  ]);
  return {
    max,
    used,
    remaining: Math.max(0, max - used),
    days: PLAN_OKAZION_DAYS,
  };
}

async function findActivePlanOkazionVoucher(sb, userId, kind, listingId) {
  const { data, error } = await sb
    .from('okazion_listing_vouchers')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'subscription')
    .eq('status', 'applied')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .order('applied_at', { ascending: false })
    .limit(5);
  if (error) {
    if (String(error.message || '').includes('okazion_listing_vouchers')) return null;
    throw error;
  }
  return (data || [])[0] || null;
}

async function applyOkazionVoucher({ userId, voucherId, kind, listingId }) {
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
    .from('okazion_listing_vouchers')
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
  const { now, until } = computeOkazionUntil(loaded.listing, days);
  await bumpListingOkazion(sb, loaded.table, listingId, until, now);
  await markRefreshAnchor(sb, { userId, kind, listingId, refreshedAt: now.toISOString() });

  const { data: applied, error: applyErr } = await sb
    .from('okazion_listing_vouchers')
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
    okazionUntil: until.toISOString(),
    refreshedAt: now.toISOString(),
  };
}

/**
 * Spend one Grow/Elite OKAZION slot: feature the post for 5 days.
 */
async function applyOkazionFromPlan({ userId, kind, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const sb = getSupabaseAdmin();
  const loaded = await loadOwnedApprovedListing(sb, { userId, kind, listingId });
  if (!loaded.ok) return loaded;

  const existing = await findActivePlanOkazionVoucher(sb, userId, kind, listingId);
  if (existing && isOkazionActive(loaded.listing)) {
    return {
      ok: true,
      alreadyActive: true,
      voucher: mapVoucher(existing),
      okazionUntil: new Date(loaded.listing.okazion_until).toISOString(),
      quota: await getOkazionQuotaSnapshot(userId),
    };
  }

  const quota = await getOkazionQuotaSnapshot(userId);
  if (quota.max <= 0) {
    return {
      ok: false,
      status: 400,
      message:
        'Paketa juaj nuk përfshin OKAZION. Upgrade në Grow/Elite ose blini një paketë ekstra.',
    };
  }
  if (quota.remaining <= 0) {
    return {
      ok: false,
      status: 400,
      message: `Keni përdorur të gjitha vendet OKAZION të paketës (${quota.used}/${quota.max}).`,
    };
  }

  const { now, until } = computeOkazionUntil(loaded.listing, PLAN_OKAZION_DAYS);
  await bumpListingOkazion(sb, loaded.table, listingId, until, now);
  await markRefreshAnchor(sb, { userId, kind, listingId, refreshedAt: now.toISOString() });

  const { data: voucherRow, error: insErr } = await sb
    .from('okazion_listing_vouchers')
    .insert({
      user_id: userId,
      package_id: PLAN_OKAZION_PACKAGE_ID,
      days: PLAN_OKAZION_DAYS,
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
  if (insErr) throw insErr;

  return {
    ok: true,
    voucher: mapVoucher(voucherRow),
    okazionUntil: until.toISOString(),
    refreshedAt: now.toISOString(),
    quota: await getOkazionQuotaSnapshot(userId),
  };
}

module.exports = {
  PLAN_OKAZION_DAYS,
  PLAN_OKAZION_PACKAGE_ID,
  isOkazionActive,
  okazionFieldsFromDoc,
  createOkazionVoucher,
  listOkazionVouchers,
  purchaseOkazionWithBoostCoins,
  applyOkazionVoucher,
  applyOkazionFromPlan,
  getOkazionQuotaSnapshot,
  clampQuantity,
  mapVoucher,
};
