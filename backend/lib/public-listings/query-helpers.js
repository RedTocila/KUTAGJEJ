const mongoose = require('mongoose');
const RealEstateCity = require('../../models/RealEstateCity');
const { DEFAULT_LIMIT, MAX_LIMIT, JOB_LISTING_VISIBLE_DAYS, MS_PER_DAY } = require('./constants');

function jobListingExpiresAt(createdAt) {
  const posted = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(posted.getTime() + JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY);
}

function isJobListingActive(doc) {
  return Date.now() < jobListingExpiresAt(doc.createdAt).getTime();
}

function activeJobCreatedAtFilter() {
  return { createdAt: { $gte: new Date(Date.now() - JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY) } };
}

function clampLimit(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function parsePagination(query) {
  const limit = clampLimit(query.limit);
  const pageRaw = Number.parseInt(String(query.page ?? ''), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function calcTotalPages(total, limit) {
  return Math.max(1, Math.ceil(total / limit) || 1);
}

function buildPaginatedResponse(listings, total, limit, page) {
  return {
    listings,
    total,
    page,
    limit,
    totalPages: calcTotalPages(total, limit),
  };
}

async function buildCityIndex(docs) {
  const cityIds = [
    ...new Set(
      docs
        .map((d) => (d.cityId ? String(d.cityId) : null))
        .filter((id) => id && mongoose.isValidObjectId(id)),
    ),
  ];
  if (cityIds.length === 0) return new Map();
  const cities = await RealEstateCity.find({
    _id: { $in: cityIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();
  return new Map(cities.map((c) => [String(c._id), c]));
}

module.exports = {
  jobListingExpiresAt,
  isJobListingActive,
  activeJobCreatedAtFilter,
  clampLimit,
  parsePagination,
  buildPaginatedResponse,
  buildCityIndex,
};
