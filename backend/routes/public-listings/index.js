'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow } = require('../../lib/profiles');
const optionalAuth = require('../../middleware/optional-auth');
const publicCache = require('../../middleware/public-cache');

const { publicNoStore } = publicCache;
const { loadPosterBrief, loadVerifiedPosterIdSet, loadTrustBadgePosterIdSet } = require('../../lib/public-listings/load-poster-brief');
const {
  clampLimit,
  buildCityIndex,
  isJobListingActive,
  parsePagination,
  buildPaginatedResponse,
  isUuid,
} = require('../../lib/public-listings/query-helpers');
const {
  formatRealEstateDetail,
  formatCarDetail,
  formatJobDetail,
  formatMarketplaceDetail,
  formatDirectoryDetail,
} = require('../../lib/public-listings/formatters');
const {
  latestRealEstate,
  latestCars,
  latestJobs,
  countActiveJobs,
  latestMarketplace,
  latestDirectory,
  queryLatestVerticals,
  attachDetailMetrics,
  queryRealEstate,
  countRealEstate,
  queryCars,
  countCars,
  queryJobs,
  countJobs,
  queryMarketplace,
  countMarketplace,
  queryDirectory,
  countDirectory,
  topViewedByKind,
  queryOkazionListings,
} = require('../../lib/public-listings/latest-queries');
const {
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
  finalizeBrowseFilter,
} = require('../../lib/public-listings/listing-filters');
const { reviewStatsByListingIds } = require('../../lib/business-review-stats');
const { professionalReviewStatsByListingIds } = require('../../lib/professional-review-stats');
const { saverFromUser, enrichListingsSaverState } = require('../../lib/listing-metrics');
const { getCached, setCached } = require('../../lib/public-listings-cache');
const { buildPublicSeoIndex } = require('../../lib/public-seo-index');

const router = express.Router();

/** Home vertical id → ListingEngagement.listingKind */
const VERTICAL_TO_KIND = {
  'real-estate': 'real-estate',
  cars: 'car',
  jobs: 'job',
  marketplace: 'marketplace',
  businesses: 'businesses',
  professionals: 'professionals',
};

function isPublicListing(doc) {
  return Boolean(doc && doc.status === 'approved');
}

async function loadApprovedById(table, id, extraEq = {}) {
  if (!isUuid(id)) return null;
  let q = getSupabaseAdmin().from(table).select('*').eq('id', id);
  for (const [col, val] of Object.entries(extraEq)) q = q.eq(col, val);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ? camelizeRow(data) : null;
}

// Short shared cache keeps public reads fast without making new ads stale for long.
router.use(publicCache(120));

/** GET /api/public/listings/seo-index — canonical active URLs for SEO metadata routes. */
router.get('/seo-index', async (_req, res) => {
  try {
    const cacheKey = 'public-seo-index';
    let payload = getCached(cacheKey);
    if (!payload) {
      payload = await buildPublicSeoIndex();
      setCached(cacheKey, payload);
    }
    res.json(payload);
  } catch (err) {
    console.error('GET /public/listings/seo-index:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/public/listings/top-viewed?vertical=cars&limit=10 — most-viewed (or highest-rated for businesses/professionals). */
router.get('/top-viewed', optionalAuth, async (req, res) => {
  try {
    const vertical = String(req.query.vertical ?? '').trim();
    const kind = VERTICAL_TO_KIND[vertical];
    if (!kind) {
      res.status(400).json({ message: 'Invalid vertical' });
      return;
    }
    const rawLimit = Number.parseInt(String(req.query.limit ?? '10'), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 10) : 10;
    let listings = await topViewedByKind(kind, limit);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json({ listings, vertical, kind });
  } catch (err) {
    console.error('GET /public/listings/top-viewed:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/public/listings/okazion — active OKAZION deals across all categories. */
router.get('/okazion', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const saver = saverFromUser(req.user);
    const cacheKey = `okazion:${limit}:${page}:${String(req.query.kind || '')}:${String(req.query.q || '')}`;
    let payload = skip === 0 ? getCached(cacheKey) : null;
    if (!payload) {
      const { listings, total } = await queryOkazionListings(limit, skip, req.query);
      payload = { listings, total };
      if (skip === 0) setCached(cacheKey, payload);
    }
    let enriched = payload.listings;
    if (saver) {
      enriched = await enrichListingsSaverState(payload.listings, saver);
    }
    res.json(buildPaginatedResponse(enriched, payload.total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/okazion:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/public/listings/recommended — slim homepage first row (no counts / OKAZION). */
router.get('/recommended', optionalAuth, async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const saver = saverFromUser(req.user);
    const cacheKey = `recommended:${limit}`;
    let bundle = getCached(cacheKey);
    if (!bundle) {
      bundle = await queryLatestVerticals(limit);
      setCached(cacheKey, bundle);
    }
    const out = { ...bundle };
    if (saver) {
      await Promise.all(
        Object.keys(out).map(async (key) => {
          out[key] = await enrichListingsSaverState(out[key], saver);
        }),
      );
    }
    res.json(out);
  } catch (err) {
    console.error('GET /public/listings/recommended:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/public/listings/latest — newest listings per vertical (homepage). */
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const saver = saverFromUser(req.user);
    const cacheKey = `latest:${limit}`;
    let cached = getCached(cacheKey);
    if (!cached) {
      const [verticals, countRe, countCarsVal, countJobsVal, countMkt, countBiz, countPro, okazionPage] =
        await Promise.all([
          queryLatestVerticals(limit),
          countRealEstate(),
          countCars(),
          countActiveJobs(),
          countMarketplace(),
          countDirectory({ eq: { vertical: 'businesses' } }),
          countDirectory({ eq: { vertical: 'professionals' } }),
          queryOkazionListings(limit, 0, {}),
        ]);
      cached = {
        ...verticals,
        okazion: okazionPage.listings,
        okazionTotal: okazionPage.total,
        totals: {
          realEstate: countRe,
          cars: countCarsVal,
          jobs: countJobsVal,
          marketplace: countMkt,
          businesses: countBiz,
          professionals: countPro,
        },
      };
      setCached(cacheKey, cached);
    }
    const bundle = {
      realEstate: cached.realEstate,
      cars: cached.cars,
      jobs: cached.jobs,
      marketplace: cached.marketplace,
      businesses: cached.businesses,
      professionals: cached.professionals,
    };
    let okazion = cached.okazion;
    if (saver) {
      await Promise.all(
        Object.keys(bundle).map(async (key) => {
          bundle[key] = await enrichListingsSaverState(bundle[key], saver);
        }),
      );
      okazion = await enrichListingsSaverState(okazion, saver);
    }
    res.json({
      realEstate: bundle.realEstate,
      cars: bundle.cars,
      jobs: bundle.jobs,
      marketplace: bundle.marketplace,
      businesses: bundle.businesses,
      professionals: bundle.professionals,
      okazion,
      okazionTotal: cached.okazionTotal,
      totals: cached.totals,
    });
  } catch (err) {
    console.error('GET /public/listings/latest:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

const LATEST_VERTICAL_HANDLERS = {
  'real-estate': {
    list: (limit) => latestRealEstate(limit),
    count: () => countRealEstate(),
  },
  cars: {
    list: (limit) => latestCars(limit),
    count: () => countCars(),
  },
  jobs: {
    list: (limit) => latestJobs(limit),
    count: () => countActiveJobs(),
  },
  marketplace: {
    list: (limit) => latestMarketplace(limit),
    count: () => countMarketplace(),
  },
  businesses: {
    list: (limit) => latestDirectory('businesses', limit),
    count: () => countDirectory({ eq: { vertical: 'businesses' } }),
  },
  professionals: {
    list: (limit) => latestDirectory('professionals', limit),
    count: () => countDirectory({ eq: { vertical: 'professionals' } }),
  },
};

/** GET /api/public/listings/latest/:vertical — one homepage carousel (lazy sections). */
router.get('/latest/:vertical', optionalAuth, async (req, res) => {
  try {
    const vertical = String(req.params.vertical ?? '').trim();
    const handlers = LATEST_VERTICAL_HANDLERS[vertical];
    if (!handlers) {
      res.status(400).json({ message: 'Invalid vertical' });
      return;
    }
    const limit = clampLimit(req.query.limit);
    const cacheKey = `latest-vertical:${vertical}:${limit}`;
    let cached = getCached(cacheKey);
    if (!cached) {
      const [listings, counted] = await Promise.all([
        handlers.list(limit),
        handlers.count().catch((err) => {
          console.error(`GET /public/listings/latest/${vertical} count:`, err?.message || err);
          return null;
        }),
      ]);
      const total = Math.max(typeof counted === 'number' ? counted : 0, listings.length);
      cached = { listings, total };
      setCached(cacheKey, cached);
    }
    let listings = cached.listings;
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json({ listings, vertical, total: cached.total });
  } catch (err) {
    console.error('GET /public/listings/latest/:vertical:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function resolvePosterAndBadges(posterId, verifiedContext, viewerId) {
  const [seller, verifiedIds, trustIds] = await Promise.all([
    loadPosterBrief(null, posterId, verifiedContext, viewerId),
    loadVerifiedPosterIdSet(posterId ? [posterId] : []),
    loadTrustBadgePosterIdSet(posterId ? [posterId] : []),
  ]);
  const isVerified = Boolean(posterId && verifiedIds.has(String(posterId))) || Boolean(seller?.verified);
  const hasTrust = Boolean(posterId && trustIds.has(String(posterId))) || Boolean(seller?.trustBadge);
  if (seller) {
    seller.verified = isVerified;
    seller.trustBadge = hasTrust;
  }
  return { seller, sellerVerified: isVerified, sellerTrustBadge: hasTrust };
}

/** Detail pages must never be CDN-stale (announcements, reviews, contact). */
router.get('/real-estate/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('real_estate_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, null, req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, {
      ...formatRealEstateDetail(doc, cityById, seller),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/real-estate/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('car_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, null, req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, {
      ...formatCarDetail(doc, cityById, seller),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/cars/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('job_listings', rawId);
    if (!isPublicListing(doc) || !isJobListingActive(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, 'jobs', req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, {
      ...formatJobDetail(doc, cityById, seller),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/jobs/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('marketplace_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, null, req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, {
      ...formatMarketplaceDetail(doc, cityById, seller),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/marketplace/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('directory_listings', rawId, {
      vertical: 'businesses',
      status: 'approved',
    });
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, null, req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await reviewStatsByListingIds([doc.id]);
    const listing = await attachDetailMetrics(req, {
      ...formatDirectoryDetail(doc, cityById, seller, reviewStats),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals/:id', publicNoStore(), optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('directory_listings', rawId, {
      vertical: 'professionals',
      status: 'approved',
    });
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const { seller, sellerVerified, sellerTrustBadge } = await resolvePosterAndBadges(doc.posterId, 'professionals', req.user?.id);
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await professionalReviewStatsByListingIds([doc.id]);
    const listing = await attachDetailMetrics(req, {
      ...formatDirectoryDetail(doc, cityById, seller, reviewStats),
      sellerVerified,
      sellerTrustBadge,
    });
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/professionals/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/real-estate', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseRealEstateFilters(req.query);
    const filter = await finalizeBrowseFilter(parsed.filter, req.query);
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countRealEstate(filter),
      queryRealEstate(limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/real-estate:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseCarFilters(req.query);
    const filter = await finalizeBrowseFilter(parsed.filter, req.query);
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countCars(filter),
      queryCars(limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/cars:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseJobFilters(req.query);
    const filter = await finalizeBrowseFilter(parsed.filter, req.query);
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countJobs(filter),
      queryJobs(limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/jobs:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseMarketplaceFilters(req.query);
    const filter = await finalizeBrowseFilter(parsed.filter, req.query);
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countMarketplace(filter),
      queryMarketplace(limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseDirectoryFilters(req.query, 'businesses');
    const filter = await finalizeBrowseFilter(parsed.filter, req.query, { vertical: 'businesses' });
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countDirectory(filter),
      queryDirectory('businesses', limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/businesses:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals', optionalAuth, async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const parsed = parseDirectoryFilters(req.query, 'professionals');
    const filter = await finalizeBrowseFilter(parsed.filter, req.query, { vertical: 'professionals' });
    const sort = parsed.sort;
    let [total, listings] = await Promise.all([
      countDirectory(filter),
      queryDirectory('professionals', limit, filter, sort, skip),
    ]);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/professionals:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
