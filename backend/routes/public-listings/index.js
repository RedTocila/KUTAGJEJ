'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow } = require('../../lib/profiles');
const optionalAuth = require('../../middleware/optional-auth');
const publicCache = require('../../middleware/public-cache');
const { loadPosterBrief } = require('../../lib/public-listings/load-poster-brief');
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
} = require('../../lib/public-listings/latest-queries');
const {
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
  finalizeTextSearch,
} = require('../../lib/public-listings/listing-filters');
const { reviewStatsByListingIds } = require('../../lib/business-review-stats');
const { professionalReviewStatsByListingIds } = require('../../lib/professional-review-stats');
const { saverFromUser, enrichListingsSaverState } = require('../../lib/listing-metrics');

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

router.use(publicCache(60));

/** GET /api/public/listings/top-viewed?vertical=cars&limit=10 — most-viewed listings for a category. */
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

/** GET /api/public/listings/latest — newest listings per vertical (homepage). */
router.get('/latest', optionalAuth, async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const saver = saverFromUser(req.user);
    const [realEstate, cars, jobs, marketplace, businesses, professionals] = await Promise.all([
      latestRealEstate(limit),
      latestCars(limit),
      latestJobs(limit),
      latestMarketplace(limit),
      latestDirectory('businesses', limit),
      latestDirectory('professionals', limit),
    ]);
    const bundle = { realEstate, cars, jobs, marketplace, businesses, professionals };
    if (saver) {
      for (const key of Object.keys(bundle)) {
        bundle[key] = await enrichListingsSaverState(bundle[key], saver);
      }
    }
    const counts = await Promise.all([
      countRealEstate(),
      countCars(),
      countActiveJobs(),
      countMarketplace(),
      countDirectory({ eq: { vertical: 'businesses' } }),
      countDirectory({ eq: { vertical: 'professionals' } }),
    ]);
    res.json({
      realEstate: bundle.realEstate,
      cars: bundle.cars,
      jobs: bundle.jobs,
      marketplace: bundle.marketplace,
      businesses: bundle.businesses,
      professionals: bundle.professionals,
      totals: {
        realEstate: counts[0],
        cars: counts[1],
        jobs: counts[2],
        marketplace: counts[3],
        businesses: counts[4],
        professionals: counts[5],
      },
    });
  } catch (err) {
    console.error('GET /public/listings/latest:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/public/listings/real-estate/:id — detail + seller summary (SSR / SEO page). */
router.get('/real-estate/:id', optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('real_estate_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(null, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, formatRealEstateDetail(doc, cityById, seller));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/real-estate/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars/:id', optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('car_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(null, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, formatCarDetail(doc, cityById, seller));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/cars/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs/:id', optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('job_listings', rawId);
    if (!isPublicListing(doc) || !isJobListingActive(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(null, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, formatJobDetail(doc, cityById, seller));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/jobs/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace/:id', optionalAuth, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    const doc = await loadApprovedById('marketplace_listings', rawId);
    if (!isPublicListing(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(null, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    const listing = await attachDetailMetrics(req, formatMarketplaceDetail(doc, cityById, seller));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/marketplace/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses/:id', optionalAuth, async (req, res) => {
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
    const seller = await loadPosterBrief(null, doc.posterId, null);
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await reviewStatsByListingIds([doc.id]);
    const listing = await attachDetailMetrics(req, formatDirectoryDetail(doc, cityById, seller, reviewStats));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals/:id', optionalAuth, async (req, res) => {
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
    const seller = await loadPosterBrief(null, doc.posterId, 'professionals');
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await professionalReviewStatsByListingIds([doc.id]);
    const listing = await attachDetailMetrics(req, formatDirectoryDetail(doc, cityById, seller, reviewStats));
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countRealEstate(filter);
    let listings = await queryRealEstate(limit, filter, sort, skip);
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countCars(filter);
    let listings = await queryCars(limit, filter, sort, skip);
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countJobs(filter);
    let listings = await queryJobs(limit, filter, sort, skip);
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countMarketplace(filter);
    let listings = await queryMarketplace(limit, filter, sort, skip);
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countDirectory(filter);
    let listings = await queryDirectory('businesses', limit, filter, sort, skip);
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
    const filter = await finalizeTextSearch(parsed.filter, req.query);
    const sort = parsed.sort;
    const total = await countDirectory(filter);
    let listings = await queryDirectory('professionals', limit, filter, sort, skip);
    const saver = saverFromUser(req.user);
    if (saver) listings = await enrichListingsSaverState(listings, saver);
    res.json(buildPaginatedResponse(listings, total, limit, page));
  } catch (err) {
    console.error('GET /public/listings/professionals:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
