const express = require('express');
const Contract = require('../models/Contract');
const ListingCategory = require('../models/ListingCategory');
const { CATEGORY_KEYS } = ListingCategory;

const router = express.Router();

function buildPriceOptions(doc) {
  const out = [];
  if (doc.price1Month != null && Number.isFinite(Number(doc.price1Month))) {
    out.push({ months: 1, labelSq: 'Mujore', price: Number(doc.price1Month) });
  }
  if (doc.price3Months != null && Number.isFinite(Number(doc.price3Months))) {
    out.push({ months: 3, labelSq: '3 muaj', price: Number(doc.price3Months) });
  }
  if (doc.price6Months != null && Number.isFinite(Number(doc.price6Months))) {
    out.push({ months: 6, labelSq: '6 muaj', price: Number(doc.price6Months) });
  }
  if (doc.price12Months != null && Number.isFinite(Number(doc.price12Months))) {
    out.push({ months: 12, labelSq: 'Vjetore', price: Number(doc.price12Months) });
  }
  return out;
}

function formatQuotas(doc) {
  return {
    maxListAllCategories: Number(doc.maxListAllCategories) || 0,
    maxJobListings: Number(doc.maxJobListings) || 0,
    maxCarListings: Number(doc.maxCarListings) || 0,
    maxApartmentListings: Number(doc.maxApartmentListings) || 0,
    maxProductListings: Number(doc.maxProductListings) || 0,
    maxPremiumListings: Number(doc.maxPremiumListings) || 0,
  };
}

async function categoryTitleMapForKeys(keys) {
  const uniq = [...new Set((keys || []).filter(Boolean))];
  if (uniq.length === 0) return {};
  const docs = await ListingCategory.find({ key: { $in: uniq } }).select('key title').lean();
  return Object.fromEntries(docs.map((d) => [d.key, d.title]));
}

function formatPublicContract(doc, categoryTitleByKey) {
  const catKey = doc.listingCategoryKey || null;
  const priceOptions = buildPriceOptions(doc);
  return {
    id: String(doc._id),
    title: doc.title,
    content: doc.content || '',
    planCode: doc.planCode || null,
    sortOrder: doc.sortOrder ?? 0,
    listingCategoryKey: catKey,
    listingCategoryTitle: catKey ? categoryTitleByKey[catKey] || catKey : null,
    subscriberKind: doc.subscriberKind || null,
    refreshEveryHours: doc.refreshEveryHours ?? null,
    glowBadgeEnabled: Boolean(doc.glowBadgeEnabled),
    boostCredits: doc.boostCredits ?? null,
    dailyBoostAccess: Boolean(doc.dailyBoostAccess),
    ...formatQuotas(doc),
    price1Month: doc.price1Month ?? null,
    price3Months: doc.price3Months ?? null,
    price6Months: doc.price6Months ?? null,
    price12Months: doc.price12Months ?? null,
    priceOptions,
  };
}

/** Public catalog: only contracts that have at least one price (incl. €0 free tier). */
router.get('/', async (req, res) => {
  try {
    const { categoryKey, subscriberKind } = req.query;
    const query = {};

    if (categoryKey && typeof categoryKey === 'string' && CATEGORY_KEYS.includes(categoryKey.trim())) {
      // Platform-wide packages (null category) + matching vertical packages.
      query.$or = [{ listingCategoryKey: categoryKey.trim() }, { listingCategoryKey: null }];
    }

    if (subscriberKind === 'agent' || subscriberKind === 'company') {
      query.subscriberKind = subscriberKind;
    }

    const docs = await Contract.find(query).sort({ sortOrder: 1, updatedAt: -1 }).lean();
    const withPrices = docs.filter((d) => buildPriceOptions(d).length > 0);
    const titleByKey = await categoryTitleMapForKeys(withPrices.map((d) => d.listingCategoryKey));
    res.json({ contracts: withPrices.map((d) => formatPublicContract(d, titleByKey)) });
  } catch (error) {
    console.error('GET /contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
