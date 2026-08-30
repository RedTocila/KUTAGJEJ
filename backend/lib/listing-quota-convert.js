'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { activeJobCreatedAtFilter, applyFilterSpec } = require('./public-listings/query-helpers');

/** Boost coins earned per unused listing slot converted. */
const CONVERT_RATES = {
  car: 2,
  product: 2,
  apartment: 0.5,
  job: 0.5,
};

const LISTING_TABLE = {
  car: { table: 'car_listings', vertical: null },
  product: { table: 'marketplace_listings', vertical: null },
  apartment: { table: 'real_estate_listings', vertical: null },
  job: { table: 'job_listings', vertical: null },
};

function normalizeCount(value) {
  const n = Math.floor(Number(value) || 0);
  return n > 0 ? n : 0;
}

function creditsFromCounts(counts) {
  const raw =
    normalizeCount(counts.car) * CONVERT_RATES.car +
    normalizeCount(counts.product) * CONVERT_RATES.product +
    normalizeCount(counts.apartment) * CONVERT_RATES.apartment +
    normalizeCount(counts.job) * CONVERT_RATES.job;
  // Boost credits are stored as integers; fractional rates (e.g. 0.5) floor in total.
  return Math.floor(raw);
}

async function countPosterListings(userId, kind) {
  const cfg = LISTING_TABLE[kind];
  if (!cfg) return 0;
  let q = getSupabaseAdmin()
    .from(cfg.table)
    .select('id', { count: 'exact', head: true })
    .eq('poster_id', userId);
  if (cfg.vertical) q = q.eq('vertical', cfg.vertical);
  if (kind === 'job') q = applyFilterSpec(q, activeJobCreatedAtFilter());
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

async function loadActivePaidSubscription(userId) {
  const nowIso = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  const paid = (data || []).find((s) => Number(s.price_eur) > 0);
  return paid || null;
}

async function getConvertibleQuotas(userId) {
  const sub = await loadActivePaidSubscription(userId);
  if (!sub) {
    return {
      hasPaidPlan: false,
      subscriptionId: null,
      available: { car: 0, product: 0, apartment: 0, job: 0 },
      used: { car: 0, product: 0, apartment: 0, job: 0 },
      max: { car: 0, product: 0, apartment: 0, job: 0 },
      rates: CONVERT_RATES,
    };
  }

  const [usedCar, usedProduct, usedApartment, usedJob] = await Promise.all([
    countPosterListings(userId, 'car'),
    countPosterListings(userId, 'product'),
    countPosterListings(userId, 'apartment'),
    countPosterListings(userId, 'job'),
  ]);

  const max = {
    car: Math.max(0, Number(sub.max_car_listings) || 0),
    product: Math.max(0, Number(sub.max_product_listings) || 0),
    apartment: Math.max(0, Number(sub.max_apartment_listings) || 0),
    job: Math.max(0, Number(sub.max_job_listings) || 0),
  };
  const used = {
    car: usedCar,
    product: usedProduct,
    apartment: usedApartment,
    job: usedJob,
  };
  const available = {
    car: Math.max(0, max.car - used.car),
    product: Math.max(0, max.product - used.product),
    apartment: Math.max(0, max.apartment - used.apartment),
    job: Math.max(0, max.job - used.job),
  };

  return {
    hasPaidPlan: true,
    subscriptionId: String(sub.id),
    available,
    used,
    max,
    rates: CONVERT_RATES,
  };
}

/**
 * Convert unused listing quotas into boost coins and shrink subscription max slots.
 */
async function convertListingQuotas(userId, countsInput) {
  const counts = {
    car: normalizeCount(countsInput?.car),
    product: normalizeCount(countsInput?.product),
    apartment: normalizeCount(countsInput?.apartment),
    job: normalizeCount(countsInput?.job),
  };

  if (Object.values(counts).every((n) => n === 0)) {
    return { ok: false, status: 400, message: 'Zgjidhni të paktën një kuotë për të konvertuar.' };
  }

  const snapshot = await getConvertibleQuotas(userId);
  if (!snapshot.hasPaidPlan || !snapshot.subscriptionId) {
    return {
      ok: false,
      status: 400,
      message: 'Konvertimi është i disponueshëm vetëm me një paketë të paguar aktive.',
    };
  }

  for (const key of Object.keys(counts)) {
    if (counts[key] > snapshot.available[key]) {
      return {
        ok: false,
        status: 400,
        message: `Nuk keni mjaftueshëm kuota të lira për «${key}».`,
      };
    }
  }

  const credits = creditsFromCounts(counts);
  if (credits < 1) {
    return {
      ok: false,
      status: 400,
      message: 'Zgjidhni më shumë për të fituar të paktën 1 Boost Coin.',
    };
  }

  const sb = getSupabaseAdmin();
  const { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .select('*')
    .eq('id', snapshot.subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (subErr) throw subErr;
  if (!sub) {
    return { ok: false, status: 404, message: 'Abonimi nuk u gjet.' };
  }

  const patch = {
    updated_at: new Date().toISOString(),
    max_car_listings: Math.max(0, (Number(sub.max_car_listings) || 0) - counts.car),
    max_product_listings: Math.max(0, (Number(sub.max_product_listings) || 0) - counts.product),
    max_apartment_listings: Math.max(0, (Number(sub.max_apartment_listings) || 0) - counts.apartment),
    max_job_listings: Math.max(0, (Number(sub.max_job_listings) || 0) - counts.job),
  };

  const { error: updSubErr } = await sb.from('user_subscriptions').update(patch).eq('id', sub.id);
  if (updSubErr) throw updSubErr;

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  if (!profile) {
    return { ok: false, status: 401, message: 'Profili nuk u gjet.' };
  }

  const nextBalance = (Number(profile.boost_credits) || 0) + credits;
  const { error: creditErr } = await sb
    .from('profiles')
    .update({ boost_credits: nextBalance, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (creditErr) throw creditErr;

  const refreshed = await getConvertibleQuotas(userId);
  return {
    ok: true,
    creditsGranted: credits,
    boostCredits: nextBalance,
    converted: counts,
    available: refreshed.available,
    max: refreshed.max,
    used: refreshed.used,
  };
}

module.exports = {
  CONVERT_RATES,
  creditsFromCounts,
  countPosterListings,
  loadActivePaidSubscription,
  getConvertibleQuotas,
  convertListingQuotas,
};
