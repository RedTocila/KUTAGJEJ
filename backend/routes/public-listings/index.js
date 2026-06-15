const express = require('express');
const mongoose = require('mongoose');
const RealEstateListing = require('../../models/RealEstateListing');
const CarListing = require('../../models/CarListing');
const JobListing = require('../../models/JobListing');
const MarketplaceListing = require('../../models/MarketplaceListing');
const DirectoryListing = require('../../models/DirectoryListing');
const optionalAuth = require('../../middleware/optional-auth');
const publicCache = require('../../middleware/public-cache');
const { loadPosterBrief } = require('../../lib/public-listings/load-poster-brief');
const { clampLimit, buildCityIndex, isJobListingActive } = require('../../lib/public-listings/query-helpers');
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
} = require('../../lib/public-listings/latest-queries');
const {
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
} = require('../../lib/public-listings/listing-filters');
const { reviewStatsByListingIds } = require('../../lib/business-review-stats');
const { professionalReviewStatsByListingIds } = require('../../lib/professional-review-stats');

const router = express.Router();

router.use(publicCache(60));

/** GET /api/public/listings/latest — newest listings per vertical (homepage). */
router.get('/latest', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const [realEstate, cars, jobs, marketplace, businesses, professionals] = await Promise.all([
      latestRealEstate(limit),
      latestCars(limit),
      latestJobs(limit),
      latestMarketplace(limit),
      latestDirectory('businesses', limit),
      latestDirectory('professionals', limit),
    ]);
    const counts = await Promise.all([
      RealEstateListing.estimatedDocumentCount(),
      CarListing.estimatedDocumentCount(),
      countActiveJobs(),
      MarketplaceListing.estimatedDocumentCount(),
      DirectoryListing.countDocuments({ vertical: 'businesses' }),
      DirectoryListing.countDocuments({ vertical: 'professionals' }),
    ]);
    res.json({
      realEstate,
      cars,
      jobs,
      marketplace,
      businesses,
      professionals,
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await RealEstateListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await CarListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await JobListing.findById(rawId).lean();
    if (!doc || !isJobListingActive(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await MarketplaceListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      vertical: 'businesses',
    }).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId, null);
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await reviewStatsByListingIds([doc._id]);
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
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      vertical: 'professionals',
    }).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId, 'professionals');
    const cityById = await buildCityIndex([doc]);
    const reviewStats = await professionalReviewStatsByListingIds([doc._id]);
    const listing = await attachDetailMetrics(req, formatDirectoryDetail(doc, cityById, seller, reviewStats));
    res.json({ listing });
  } catch (err) {
    console.error('GET /public/listings/professionals/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/real-estate', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseRealEstateFilters(req.query);
    const [listings, total] = await Promise.all([
      queryRealEstate(limit, filter, sort),
      countRealEstate(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/real-estate:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseCarFilters(req.query);
    const [listings, total] = await Promise.all([
      queryCars(limit, filter, sort),
      countCars(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/cars:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseJobFilters(req.query);
    const [listings, total] = await Promise.all([
      queryJobs(limit, filter, sort),
      countJobs(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/jobs:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseMarketplaceFilters(req.query);
    const [listings, total] = await Promise.all([
      queryMarketplace(limit, filter, sort),
      countMarketplace(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseDirectoryFilters(req.query, 'businesses');
    const [listings, total] = await Promise.all([
      queryDirectory('businesses', limit, filter, sort),
      countDirectory(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/businesses:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const { filter, sort } = parseDirectoryFilters(req.query, 'professionals');
    const [listings, total] = await Promise.all([
      queryDirectory('professionals', limit, filter, sort),
      countDirectory(filter),
    ]);
    res.json({ listings, total });
  } catch (err) {
    console.error('GET /public/listings/professionals:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
