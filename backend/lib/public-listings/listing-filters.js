const mongoose = require('mongoose');
const { PROPERTY_SLUGS } = require('../real-estate-field-rules');
const { FUEL_TYPE_VALUES, CAR_MAKES, TRANSMISSION_VALUES } = require('../car-field-rules');
const {
  INDUSTRY_VALUES,
  EDUCATION_VALUES,
  EXPERIENCE_VALUES,
  JOB_TYPE_VALUES,
  WORK_LOCATION_VALUES,
} = require('../job-field-rules');
const { BUSINESS_CATEGORIES } = require('../directory-business-validation');
const { PROFESSIONAL_CATEGORIES } = require('../directory-professional-validation');
const { activeJobCreatedAtFilter } = require('./query-helpers');

const MARKETPLACE_CATEGORY_VALUES = [
  'elektronike', 'mobilje-shtepi', 'veshje-aksesore', 'libra-shkolla',
  'sport-hobi', 'lodra', 'automjete-pjese', 'ushqime-bujqesi', 'sherbime', 'te-tjera',
];

const MARKETPLACE_CONDITION_VALUES = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];

const SORT_VALUES = new Set(['newest', 'price-asc', 'price-desc']);

function parseObjectId(value) {
  const raw = String(value ?? '').trim();
  return mongoose.isValidObjectId(raw) ? new mongoose.Types.ObjectId(raw) : null;
}

function parseObjectIdArray(query, key) {
  const raw = query[key];
  const values = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
  const seen = new Set();
  const ids = [];
  for (const value of values) {
    const id = parseObjectId(value);
    if (!id) continue;
    const token = String(id);
    if (seen.has(token)) continue;
    seen.add(token);
    ids.push(id);
  }
  return ids;
}

function parsePositiveInt(value) {
  const n = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseAllowedString(value, allowed) {
  const raw = String(value ?? '').trim().toLowerCase();
  return allowed.has(raw) ? raw : null;
}

function parseAllowedFromArray(value, allowedValues) {
  const raw = String(value ?? '').trim().toLowerCase();
  return allowedValues.includes(raw) ? raw : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTextSearch(filter, query, fields) {
  const q = String(query.q ?? '').trim();
  if (q.length < 2 || q.length > 80) return;
  const pattern = { $regex: escapeRegex(q), $options: 'i' };
  const clauses = fields.map((field) => ({ [field]: pattern }));
  if (clauses.length === 1) {
    Object.assign(filter, clauses[0]);
    return;
  }
  filter.$or = clauses;
}

function applyPriceRange(filter, minPrice, maxPrice) {
  const min = parsePositiveInt(minPrice);
  const max = parsePositiveInt(maxPrice);
  if (min == null && max == null) return;
  filter.price = {};
  if (min != null) filter.price.$gte = min;
  if (max != null) filter.price.$lte = max;
}

function parseSort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return SORT_VALUES.has(raw) ? raw : 'newest';
}

function buildPriceSort(sort, field = 'price') {
  if (sort === 'price-asc') return { [field]: 1, createdAt: -1 };
  if (sort === 'price-desc') return { [field]: -1, createdAt: -1 };
  return { createdAt: -1 };
}

function parseRealEstateFilters(query) {
  const filter = {};
  const cat = parseAllowedFromArray(query.cat || query.category, PROPERTY_SLUGS);
  if (cat) filter.propertyCategory = cat;

  const tx = parseAllowedString(query.tx || query.transaction, new Set(['rent', 'sale']));
  if (tx) filter.transactionType = tx;

  const cityId = parseObjectId(query.city);
  if (cityId) filter.cityId = cityId;

  const zoneIds = parseObjectIdArray(query, 'zone');
  if (zoneIds.length) filter.zoneId = { $in: zoneIds };

  applyPriceRange(filter, query.minPrice, query.maxPrice);

  const minSurface = parsePositiveInt(query.minSurface);
  if (minSurface != null) filter.surfaceM2 = { $gte: minSurface };

  const bedrooms = parsePositiveInt(query.bedrooms);
  if (bedrooms != null) filter.bedrooms = { $gte: bedrooms };

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildPriceSort(sort) };
}

function parseCarFilters(query) {
  const filter = {};
  const fuel = parseAllowedFromArray(query.fuel, FUEL_TYPE_VALUES);
  if (fuel) filter.fuelType = fuel;

  const make = String(query.make ?? '').trim();
  if (make && CAR_MAKES.includes(make)) filter.make = make;

  const transmission = parseAllowedFromArray(query.transmission, TRANSMISSION_VALUES);
  if (transmission) filter.transmission = transmission;

  const cityId = parseObjectId(query.city);
  if (cityId) filter.cityId = cityId;

  applyPriceRange(filter, query.minPrice, query.maxPrice);

  const minYear = parsePositiveInt(query.minYear);
  const maxYear = parsePositiveInt(query.maxYear);
  if (minYear != null || maxYear != null) {
    filter.year = {};
    if (minYear != null) filter.year.$gte = minYear;
    if (maxYear != null) filter.year.$lte = maxYear;
  }

  const maxKm = parsePositiveInt(query.maxKm);
  if (maxKm != null) filter.kilometers = { $lte: maxKm };

  applyTextSearch(filter, query, ['title', 'description', 'make', 'model', 'trim']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildPriceSort(sort) };
}

function parseJobFilters(query) {
  const filter = { ...activeJobCreatedAtFilter() };

  const industry = parseAllowedFromArray(query.industry, INDUSTRY_VALUES);
  if (industry) filter.industry = industry;

  const jobType = parseAllowedFromArray(query.jobType, JOB_TYPE_VALUES);
  if (jobType) filter.jobType = jobType;

  const workLocation = parseAllowedFromArray(query.workLocation, WORK_LOCATION_VALUES);
  if (workLocation) filter.workLocation = workLocation;

  const education = parseAllowedFromArray(query.education, EDUCATION_VALUES);
  if (education) filter.education = education;

  const experience = parseAllowedFromArray(query.experience, EXPERIENCE_VALUES);
  if (experience) filter.experience = experience;

  const cityId = parseObjectId(query.city);
  if (cityId) filter.cityId = cityId;

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildPriceSort(sort, 'salary') };
}

function parseMarketplaceFilters(query) {
  const filter = {};
  const cat = parseAllowedFromArray(query.cat || query.category, MARKETPLACE_CATEGORY_VALUES);
  if (cat) filter.category = cat;

  const condition = parseAllowedFromArray(query.condition, MARKETPLACE_CONDITION_VALUES);
  if (condition) filter.condition = condition;

  const cityId = parseObjectId(query.city);
  if (cityId) filter.cityId = cityId;

  applyPriceRange(filter, query.minPrice, query.maxPrice);

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildPriceSort(sort) };
}

function parseDirectoryFilters(query, vertical) {
  const filter = { vertical };
  const allowed =
    vertical === 'businesses'
      ? BUSINESS_CATEGORIES
      : PROFESSIONAL_CATEGORIES;

  const type = parseAllowedString(query.type || query.cat || query.category, allowed);
  if (type) filter.category = type;

  const cityId = parseObjectId(query.city);
  if (cityId) filter.cityId = cityId;

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildPriceSort(sort) };
}

module.exports = {
  MARKETPLACE_CATEGORY_VALUES,
  MARKETPLACE_CONDITION_VALUES,
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
};
