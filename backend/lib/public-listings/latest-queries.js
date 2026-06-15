const RealEstateListing = require('../../models/RealEstateListing');
const CarListing = require('../../models/CarListing');
const JobListing = require('../../models/JobListing');
const MarketplaceListing = require('../../models/MarketplaceListing');
const DirectoryListing = require('../../models/DirectoryListing');
const { attachMetricsToListings, attachMetricsToListing, fetchMetricsMap, saverFromUser } = require('../listing-metrics');
const { reviewStatsByListingIds } = require('../business-review-stats');
const { professionalReviewStatsByListingIds } = require('../professional-review-stats');
const { activeJobCreatedAtFilter, buildCityIndex } = require('./query-helpers');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./formatters');

async function queryRealEstate(limit, filter = {}, sort = { createdAt: -1 }) {
  const docs = await RealEstateListing.find(filter).sort(sort).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatRealEstate(d, cityById)));
}

async function countRealEstate(filter = {}) {
  return RealEstateListing.countDocuments(filter);
}

async function queryCars(limit, filter = {}, sort = { createdAt: -1 }) {
  const docs = await CarListing.find(filter).sort(sort).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatCar(d, cityById)));
}

async function countCars(filter = {}) {
  return CarListing.countDocuments(filter);
}

async function queryJobs(limit, filter = activeJobCreatedAtFilter(), sort = { createdAt: -1 }) {
  const docs = await JobListing.find(filter).sort(sort).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatJob(d, cityById)));
}

async function countJobs(filter = activeJobCreatedAtFilter()) {
  return JobListing.countDocuments(filter);
}

async function countActiveJobs() {
  return countJobs(activeJobCreatedAtFilter());
}

async function queryMarketplace(limit, filter = {}, sort = { createdAt: -1 }) {
  const docs = await MarketplaceListing.find(filter).sort(sort).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatMarketplace(d, cityById)));
}

async function countMarketplace(filter = {}) {
  return MarketplaceListing.countDocuments(filter);
}

async function queryDirectory(vertical, limit, filter = { vertical }, sort = { createdAt: -1 }) {
  const docs = await DirectoryListing.find(filter).sort(sort).limit(limit).lean();
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
  return DirectoryListing.countDocuments(filter);
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
  attachDetailMetrics,
};
