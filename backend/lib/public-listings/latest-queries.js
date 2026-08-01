const RealEstateListing = require('../../models/RealEstateListing');
const CarListing = require('../../models/CarListing');
const JobListing = require('../../models/JobListing');
const MarketplaceListing = require('../../models/MarketplaceListing');
const DirectoryListing = require('../../models/DirectoryListing');
const ListingEngagement = require('../../models/ListingEngagement');
const { attachMetricsToListings, attachMetricsToListing, fetchMetricsMap, saverFromUser } = require('../listing-metrics');
const { reviewStatsByListingIds } = require('../business-review-stats');
const { professionalReviewStatsByListingIds } = require('../professional-review-stats');
const { activeJobCreatedAtFilter, buildCityIndex } = require('./query-helpers');
const { mergePublicFilter } = require('../listing-moderation');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./formatters');

const MODEL_BY_KIND = {
  'real-estate': RealEstateListing,
  car: CarListing,
  job: JobListing,
  marketplace: MarketplaceListing,
  businesses: DirectoryListing,
  professionals: DirectoryListing,
};

function baseFilterForKind(kind) {
  if (kind === 'job') return activeJobCreatedAtFilter();
  if (kind === 'businesses' || kind === 'professionals') return { vertical: kind };
  return {};
}

async function formatDocsForKind(kind, docs) {
  const cityById = await buildCityIndex(docs);
  if (kind === 'real-estate') {
    return attachMetricsToListings(docs.map((d) => formatRealEstate(d, cityById)));
  }
  if (kind === 'car') {
    return attachMetricsToListings(docs.map((d) => formatCar(d, cityById)));
  }
  if (kind === 'job') {
    return attachMetricsToListings(docs.map((d) => formatJob(d, cityById)));
  }
  if (kind === 'marketplace') {
    return attachMetricsToListings(docs.map((d) => formatMarketplace(d, cityById)));
  }
  let reviewStats = null;
  if (kind === 'businesses') {
    reviewStats = await reviewStatsByListingIds(docs.map((d) => d._id));
  } else if (kind === 'professionals') {
    reviewStats = await professionalReviewStatsByListingIds(docs.map((d) => d._id));
  }
  return attachMetricsToListings(docs.map((d) => formatDirectory(d, cityById, reviewStats)));
}

/**
 * Top listings for a vertical by view count (ListingEngagement).
 * Falls back to newest approved listings when engagement data is sparse.
 */
async function topViewedByKind(kind, limit) {
  const Model = MODEL_BY_KIND[kind];
  if (!Model || limit <= 0) return [];

  const baseFilter = baseFilterForKind(kind);
  const engagements = await ListingEngagement.find({
    listingKind: kind,
    viewCount: { $gt: 0 },
  })
    .sort({ viewCount: -1 })
    .limit(Math.max(limit * 3, limit))
    .select('listingId viewCount')
    .lean();

  const orderedDocs = [];
  const seen = new Set();

  if (engagements.length > 0) {
    const ids = engagements.map((e) => e.listingId);
    const docs = await Model.find(mergePublicFilter({ ...baseFilter, _id: { $in: ids } })).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    for (const e of engagements) {
      const doc = byId.get(String(e.listingId));
      if (!doc) continue;
      const id = String(doc._id);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedDocs.push(doc);
      if (orderedDocs.length >= limit) break;
    }
  }

  if (orderedDocs.length < limit) {
    const fillers = await Model.find(mergePublicFilter(baseFilter))
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();
    for (const doc of fillers) {
      const id = String(doc._id);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedDocs.push(doc);
      if (orderedDocs.length >= limit) break;
    }
  }

  if (orderedDocs.length === 0) return [];
  return formatDocsForKind(kind, orderedDocs);
}

async function queryRealEstate(limit, filter = {}, sort = { createdAt: -1 }, skip = 0) {
  const merged = mergePublicFilter(filter);
  const docs = await RealEstateListing.find(merged).sort(sort).skip(skip).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatRealEstate(d, cityById)));
}

async function countRealEstate(filter = {}) {
  return RealEstateListing.countDocuments(mergePublicFilter(filter));
}

async function queryCars(limit, filter = {}, sort = { createdAt: -1 }, skip = 0) {
  const merged = mergePublicFilter(filter);
  const docs = await CarListing.find(merged).sort(sort).skip(skip).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatCar(d, cityById)));
}

async function countCars(filter = {}) {
  return CarListing.countDocuments(mergePublicFilter(filter));
}

async function queryJobs(limit, filter, sort = { createdAt: -1 }, skip = 0) {
  const merged = mergePublicFilter(filter ?? activeJobCreatedAtFilter());
  const docs = await JobListing.find(merged).sort(sort).skip(skip).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatJob(d, cityById)));
}

async function countJobs(filter) {
  return JobListing.countDocuments(mergePublicFilter(filter ?? activeJobCreatedAtFilter()));
}

async function countActiveJobs() {
  return countJobs(activeJobCreatedAtFilter());
}

async function queryMarketplace(limit, filter = {}, sort = { createdAt: -1 }, skip = 0) {
  const merged = mergePublicFilter(filter);
  const docs = await MarketplaceListing.find(merged).sort(sort).skip(skip).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatMarketplace(d, cityById)));
}

async function countMarketplace(filter = {}) {
  return MarketplaceListing.countDocuments(mergePublicFilter(filter));
}

async function queryDirectory(vertical, limit, filter = { vertical }, sort = { createdAt: -1 }, skip = 0) {
  const merged = mergePublicFilter(filter);
  const docs = await DirectoryListing.find(merged).sort(sort).skip(skip).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  let reviewStats = null;
  if (vertical === 'businesses') {
    reviewStats = await reviewStatsByListingIds(docs.map((d) => d._id));
  } else if (vertical === 'professionals') {
    reviewStats = await professionalReviewStatsByListingIds(docs.map((d) => d._id));
  }
  return attachMetricsToListings(docs.map((d) => formatDirectory(d, cityById, reviewStats)));
}

async function countDirectory(filter = {}) {
  return DirectoryListing.countDocuments(mergePublicFilter(filter));
}

async function latestRealEstate(limit) {
  return queryRealEstate(limit);
}

async function latestCars(limit) {
  return queryCars(limit);
}

async function latestJobs(limit) {
  return queryJobs(limit);
}

async function latestMarketplace(limit) {
  return queryMarketplace(limit);
}

async function latestDirectory(vertical, limit) {
  return queryDirectory(vertical, limit);
}

async function attachDetailMetrics(req, listing) {
  const saver = saverFromUser(req.user);
  const map = await fetchMetricsMap([{ kind: listing.kind, listingId: listing.id }], saver);
  return attachMetricsToListing(listing, map, saver);
}

module.exports = {
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
  latestRealEstate,
  latestCars,
  latestJobs,
  countActiveJobs,
  latestMarketplace,
  latestDirectory,
  topViewedByKind,
  attachDetailMetrics,
};
