'use strict';

const {
  countPosterListings,
  loadActivePaidSubscription,
  categoryUsageFromSubscription,
  consumeSubscriptionSlot,
} = require('./listing-quota-convert');
const { getSupabaseAdmin } = require('./supabase');
const { isJobListingActive } = require('./public-listings/query-helpers');
const { packagePeriodStart } = require('./package-period');

/** Matches seeded FREE plan when contracts row is missing. */
const FREE_FALLBACK_MAX = {
  car: 5,
  product: 5,
  apartment: 10,
  job: 10,
};

const KIND_LABELS = {
  car: 'Makina',
  product: 'Produkte',
  apartment: 'Apartamente',
  job: 'Vende pune',
};

const CATEGORY_KEY_TO_KIND = {
  cars: 'car',
  marketplace: 'product',
  'real-estate': 'apartment',
  'job-listings': 'job',
};

function isQuotaKind(kind) {
  return Boolean(KIND_LABELS[kind]);
}

function kindFromCategoryKey(categoryKey) {
  return CATEGORY_KEY_TO_KIND[categoryKey] || null;
}

async function loadFreePlanMax() {
  const { data, error } = await getSupabaseAdmin()
    .from('contracts')
    .select('max_job_listings, max_car_listings, max_apartment_listings, max_product_listings')
    .eq('plan_code', 'free')
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  const row = (data || [])[0];
  if (!row) return { ...FREE_FALLBACK_MAX };
  return {
    car: Math.max(0, Number(row.max_car_listings) || 0),
    product: Math.max(0, Number(row.max_product_listings) || 0),
    apartment: Math.max(0, Number(row.max_apartment_listings) || 0),
    job: Math.max(0, Number(row.max_job_listings) || 0),
  };
}

function packageQuotaReachedMessage(label, used, max) {
  return `Keni arritur limitin e njoftimeve për «${label}» në këtë paketë (${used}/${max}). Kuota fillon nga 0 kur fillon paketa tjetër.`;
}

/**
 * When the free package became the current package.
 * After a paid package ends or is canceled, that moment is the new start.
 * Otherwise the account creation date is the start. Periods then follow that
 * instant month by month, not the 1st. Listings from earlier periods stay up.
 */
async function freePackagePeriodStart(userId, now = new Date()) {
  const sb = getSupabaseAdmin();
  const { data: subs, error } = await sb
    .from('user_subscriptions')
    .select('expires_at, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;

  let anchor = null;
  for (const sub of subs || []) {
    const end = sub.expires_at ? new Date(sub.expires_at) : null;
    const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : NaN;
    const ended =
      sub.status === 'canceled' ||
      sub.status === 'expired' ||
      (Number.isFinite(endMs) && endMs <= now.getTime());
    if (ended && Number.isFinite(endMs)) {
      anchor = end;
      break;
    }
  }

  if (!anchor) {
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    const created = profile?.created_at ? new Date(profile.created_at) : now;
    anchor = Number.isNaN(created.getTime()) ? now : created;
  }

  return packagePeriodStart(anchor, now);
}

/**
 * Caps used when posting category listings.
 * Paid plans: counters on that subscription. They start at 0 when the package
 * is granted again, including after a cancel. They do not reset on the 1st.
 * Free plan: listings created in the current free-package period.
 * Listings are never deleted when a package starts.
 */
async function getPostingQuotaSnapshot(userId) {
  const sub = await loadActivePaidSubscription(userId);
  if (sub) {
    const { max, used, available } = categoryUsageFromSubscription(sub);
    return {
      hasPaidPlan: true,
      subscriptionId: String(sub.id),
      max,
      used,
      available,
    };
  }

  const max = await loadFreePlanMax();
  const since = await freePackagePeriodStart(userId);
  const [usedCar, usedProduct, usedApartment, usedJob] = await Promise.all([
    countPosterListings(userId, 'car', { since }),
    countPosterListings(userId, 'product', { since }),
    countPosterListings(userId, 'apartment', { since }),
    countPosterListings(userId, 'job', { since }),
  ]);

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
    hasPaidPlan: false,
    subscriptionId: null,
    max,
    used,
    available,
  };
}

/**
 * Block create when category max is 0 or all slots are used.
 * @returns {{ ok: true, snapshot } | { ok: false, status: number, message: string, snapshot? }}
 */
async function assertCanCreateCategoryListing(userId, kind) {
  if (!isQuotaKind(kind)) {
    return { ok: false, status: 400, message: 'Kategori e pavlefshme për kuotë.' };
  }

  const snapshot = await getPostingQuotaSnapshot(userId);
  const label = KIND_LABELS[kind];
  const max = snapshot.max[kind];
  const used = snapshot.used[kind];
  const available = snapshot.available[kind];

  if (max <= 0) {
    return {
      ok: false,
      status: 403,
      message: `Kuota për «${label}» nuk është e disponueshme në paketën tuaj.`,
      snapshot,
    };
  }
  if (available <= 0) {
    return {
      ok: false,
      status: 403,
      message: packageQuotaReachedMessage(label, used, max),
      snapshot,
    };
  }

  return { ok: true, snapshot };
}

/**
 * After a successful listing create: consume one slot on the active paid package.
 * Free plan has no consumption counter (listings in the current package period are enough).
 */
async function recordCategoryListingSlotUse(userId, kind) {
  if (!isQuotaKind(kind)) {
    return { ok: false, status: 400, message: 'Kategori e pavlefshme për kuotë.' };
  }
  const sub = await loadActivePaidSubscription(userId);
  if (!sub) return { ok: true, skipped: true };

  const result = await consumeSubscriptionSlot(userId, kind);
  if (!result.ok) {
    const label = KIND_LABELS[kind];
    return {
      ...result,
      message:
        result.message ||
        packageQuotaReachedMessage(label, result.used, result.max),
    };
  }
  return result;
}

/**
 * Job boost/reactivate does not consume another category slot — create already did
 * (or free-plan concurrent rules apply separately at create time).
 */
async function assertCanReactivateJobListing(userId, listing) {
  if (!listing || isJobListingActive(listing)) return { ok: true };

  const snapshot = await getPostingQuotaSnapshot(userId);
  if (snapshot.max.job <= 0) {
    return {
      ok: false,
      status: 403,
      message: 'Kuota për «Vende pune» nuk është e disponueshme në paketën tuaj.',
    };
  }
  return { ok: true, snapshot };
}

module.exports = {
  KIND_LABELS,
  CATEGORY_KEY_TO_KIND,
  FREE_FALLBACK_MAX,
  isQuotaKind,
  kindFromCategoryKey,
  getPostingQuotaSnapshot,
  assertCanCreateCategoryListing,
  recordCategoryListingSlotUse,
  assertCanReactivateJobListing,
};
