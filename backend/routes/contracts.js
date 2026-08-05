'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');

const router = express.Router();

const CATEGORY_KEYS = ['real-estate', 'job-listings', 'cars', 'marketplace', 'businesses', 'professionals'];

function buildPriceOptions(doc) {
  const out = [];
  const p1 = doc.price_1_month ?? doc.price1Month;
  const p3 = doc.price_3_months ?? doc.price3Months;
  const p6 = doc.price_6_months ?? doc.price6Months;
  const p12 = doc.price_12_months ?? doc.price12Months;
  if (p1 != null && Number.isFinite(Number(p1))) {
    out.push({ months: 1, labelSq: 'Mujore', price: Number(p1) });
  }
  if (p3 != null && Number.isFinite(Number(p3))) {
    out.push({ months: 3, labelSq: '3 muaj', price: Number(p3) });
  }
  if (p6 != null && Number.isFinite(Number(p6))) {
    out.push({ months: 6, labelSq: '6 muaj', price: Number(p6) });
  }
  if (p12 != null && Number.isFinite(Number(p12))) {
    out.push({ months: 12, labelSq: 'Vjetore', price: Number(p12) });
  }
  return out;
}

function formatQuotas(doc) {
  return {
    maxListAllCategories: Number(doc.max_list_all_categories ?? doc.maxListAllCategories) || 0,
    maxJobListings: Number(doc.max_job_listings ?? doc.maxJobListings) || 0,
    maxCarListings: Number(doc.max_car_listings ?? doc.maxCarListings) || 0,
    maxApartmentListings: Number(doc.max_apartment_listings ?? doc.maxApartmentListings) || 0,
    maxProductListings: Number(doc.max_product_listings ?? doc.maxProductListings) || 0,
    maxPremiumListings: Number(doc.max_premium_listings ?? doc.maxPremiumListings) || 0,
    maxOkazionListings: Number(doc.max_okazion_listings ?? doc.maxOkazionListings) || 0,
  };
}

async function categoryTitleMapForKeys(keys) {
  const uniq = [...new Set((keys || []).filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await getSupabaseAdmin()
    .from('listing_categories')
    .select('key, title')
    .in('key', uniq);
  if (error) throw error;
  return Object.fromEntries((data || []).map((d) => [d.key, d.title]));
}

function formatPublicContract(doc, categoryTitleByKey) {
  const catKey = doc.listing_category_key || null;
  const priceOptions = buildPriceOptions(doc);
  return {
    id: String(doc.id),
    title: doc.title,
    content: doc.content || '',
    planCode: doc.plan_code || null,
    sortOrder: doc.sort_order ?? 0,
    listingCategoryKey: catKey,
    listingCategoryTitle: catKey ? categoryTitleByKey[catKey] || catKey : null,
    subscriberKind: doc.subscriber_kind || null,
    refreshEveryHours: doc.refresh_every_hours ?? null,
    glowBadgeEnabled: Boolean(doc.glow_badge_enabled),
    boostCredits: doc.boost_credits ?? null,
    dailyBoostAccess: Boolean(doc.daily_boost_access),
    ...formatQuotas(doc),
    price1Month: doc.price_1_month != null ? Number(doc.price_1_month) : null,
    price3Months: doc.price_3_months != null ? Number(doc.price_3_months) : null,
    price6Months: doc.price_6_months != null ? Number(doc.price_6_months) : null,
    price12Months: doc.price_12_months != null ? Number(doc.price_12_months) : null,
    priceOptions,
  };
}

/** Public catalog: only contracts that have at least one price (incl. €0 free tier). */
router.get('/', async (req, res) => {
  try {
    const { categoryKey, subscriberKind } = req.query;
    const sb = getSupabaseAdmin();
    let query = sb.from('contracts').select('*');

    if (categoryKey && typeof categoryKey === 'string' && CATEGORY_KEYS.includes(categoryKey.trim())) {
      const key = categoryKey.trim();
      query = query.or(`listing_category_key.eq.${key},listing_category_key.is.null`);
    }

    if (subscriberKind === 'agent' || subscriberKind === 'company') {
      query = query.eq('subscriber_kind', subscriberKind);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const withPrices = (data || []).filter((d) => buildPriceOptions(d).length > 0);
    const titleByKey = await categoryTitleMapForKeys(withPrices.map((d) => d.listing_category_key));
    res.json({ contracts: withPrices.map((d) => formatPublicContract(d, titleByKey)) });
  } catch (error) {
    console.error('GET /contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
