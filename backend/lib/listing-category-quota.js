'use strict';

const { getSupabaseAdmin } = require('./supabase');
const {
  countPosterListings,
  loadActivePaidSubscription,
} = require('./listing-quota-convert');

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

/**
 * Caps used when posting category listings (paid sub max_* or FREE plan).
 * Same rules as the user dashboard package panel.
 */
async function getPostingQuotaSnapshot(userId) {
  const sub = await loadActivePaidSubscription(userId);
  const max = sub
    ? {
        car: Math.max(0, Number(sub.max_car_listings) || 0),
        product: Math.max(0, Number(sub.max_product_listings) || 0),
        apartment: Math.max(0, Number(sub.max_apartment_listings) || 0),
        job: Math.max(0, Number(sub.max_job_listings) || 0),
      }
    : await loadFreePlanMax();

  const [usedCar, usedProduct, usedApartment, usedJob] = await Promise.all([
    countPosterListings(userId, 'car'),
    countPosterListings(userId, 'product'),
    countPosterListings(userId, 'apartment'),
    countPosterListings(userId, 'job'),
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
    hasPaidPlan: Boolean(sub),
    subscriptionId: sub ? String(sub.id) : null,
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
      message: `Keni arritur limitin e njoftimeve për «${label}» (${used}/${max}).`,
      snapshot,
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
};
