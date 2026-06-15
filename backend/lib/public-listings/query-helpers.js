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
  buildCityIndex,
};
