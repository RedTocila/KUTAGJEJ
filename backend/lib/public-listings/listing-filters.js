'use strict';

const { PROPERTY_SLUGS } = require('../real-estate-field-rules');
const { FUEL_TYPE_VALUES, CAR_MAKES, TRANSMISSION_VALUES, VEHICLE_TYPE_VALUES } = require('../car-field-rules');
const { isValidVehicleMake, modelsForMake } = require('../vehicle-catalog');
const {
  INDUSTRY_VALUES,
  EDUCATION_VALUES,
  EXPERIENCE_VALUES,
  JOB_TYPE_VALUES,
  WORK_LOCATION_VALUES,
} = require('../job-field-rules');
const { BUSINESS_CATEGORIES } = require('../directory-business-validation');
const { PROFESSIONAL_CATEGORIES } = require('../directory-professional-validation');
const { getSupabaseAdmin } = require('../supabase');
const {
  activeJobCreatedAtFilter,
  isUuid,
  parseSort,
  buildSort,
  buildDirectorySort,
  buildIlikeOrFilter,
  parseQueryKeywords,
  locationOrForNeedle,
  mergeSpecs,
  rankListingIdsByReviews,
  EMPTY_IN_UUID,
} = require('./query-helpers');

const MARKETPLACE_CATEGORY_VALUES = [
  'elektronike', 'mobilje-shtepi', 'veshje-aksesore', 'libra-shkolla',
  'sport-hobi', 'lodra', 'automjete-pjese', 'ushqime-bujqesi', 'sherbime', 'te-tjera',
];

const MARKETPLACE_CONDITION_VALUES = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];

function parseUuid(value) {
  const raw = String(value ?? '').trim();
  return isUuid(raw) ? raw : null;
}

function parseUuidArray(query, key) {
  const raw = query[key];
  const values = Array.isArray(raw) ? raw : raw != null && raw !== '' ? [raw] : [];
  const seen = new Set();
  const ids = [];
  for (const value of values) {
    const id = parseUuid(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
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

function applyTextSearch(spec, query, fields) {
  const keywords = parseQueryKeywords(query);
  const groups = keywords.map((q) => buildIlikeOrFilter(fields, q)).filter(Boolean);
  if (!groups.length) return;
  if (Array.isArray(spec.andOr) && spec.andOr.length) {
    spec.andOr.push(...groups);
  } else if (groups.length === 1) {
    spec.or = groups[0];
  } else {
    spec.andOr = groups;
  }
}

/** Keyword search → relevance only (no OKAZION / Premium pin to the top). */
function featuredBoostForQuery(query) {
  const searching = parseQueryKeywords(query).some((q) => q.length >= 2);
  if (!searching) return {};
  return { includeOkazion: false, includePremium: false };
}

/** Finish keyword search: accent-tolerant text match + city/zone name resolution. */
async function finalizeTextSearch(filter, query) {
  const keywords = parseQueryKeywords(query);
  if (!keywords.length) return filter;

  let next = filter;
  const groups = Array.isArray(next.andOr) ? [...next.andOr] : next.or ? [next.or] : [];
  for (let i = 0; i < keywords.length; i += 1) {
    const loc = await locationOrForNeedle(keywords[i]);
    if (!loc) continue;
    if (groups.length) {
      const idx = Math.min(i, groups.length - 1);
      groups[idx] = `${groups[idx]},${loc}`;
    } else {
      groups.push(loc);
    }
  }

  if (!groups.length) return next;
  if (groups.length === 1) {
    const { andOr: _andOr, ...rest } = next;
    return { ...rest, or: groups[0] };
  }
  const { or: _or, ...rest } = next;
  return { ...rest, andOr: groups };
}

function applyPriceRange(spec, minPrice, maxPrice) {
  const min = parsePositiveInt(minPrice);
  const max = parsePositiveInt(maxPrice);
  if (min == null && max == null) return;
  if (!spec.gte) spec.gte = {};
  if (!spec.lte) spec.lte = {};
  if (min != null) spec.gte.price = min;
  if (max != null) spec.lte.price = max;
}

function parseRealEstateFilters(query) {
  const filter = { eq: {}, gte: {}, lte: {}, in: {} };

  const cat = parseAllowedFromArray(query.cat || query.category, PROPERTY_SLUGS);
  if (cat) filter.eq.property_category = cat;

  const tx = parseAllowedString(query.tx || query.transaction, new Set(['rent', 'sale']));
  if (tx) filter.eq.transaction_type = tx;

  const cityId = parseUuid(query.city);
  if (cityId) filter.eq.city_id = cityId;

  const zoneIds = parseUuidArray(query, 'zone');
  if (zoneIds.length) filter.in.zone_id = zoneIds;

  applyPriceRange(filter, query.minPrice, query.maxPrice);

  const minSurface = parsePositiveInt(query.minSurface);
  if (minSurface != null) filter.gte.surface_m2 = minSurface;

  const bedrooms = parsePositiveInt(query.bedrooms);
  if (bedrooms != null) filter.gte.bedrooms = bedrooms;

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildSort(sort, 'price', featuredBoostForQuery(query)) };
}

function parseCarFilters(query) {
  const filter = { eq: {}, gte: {}, lte: {} };

  const vehicleType = parseAllowedFromArray(query.type, VEHICLE_TYPE_VALUES);
  if (vehicleType) filter.eq.vehicle_type = vehicleType;

  const fuel = parseAllowedFromArray(query.fuel, FUEL_TYPE_VALUES);
  if (fuel) filter.eq.fuel_type = fuel;

  const make = String(query.make ?? '').trim();
  if (make && (vehicleType ? isValidVehicleMake(vehicleType, make) : CAR_MAKES.includes(make))) {
    filter.eq.make = make;
  }

  const model = String(query.model ?? '').trim();
  if (model && make && vehicleType) {
    const allowed = modelsForMake(vehicleType, make);
    if (allowed.includes(model)) filter.eq.model = model;
  }

  const transmission = parseAllowedFromArray(query.transmission, TRANSMISSION_VALUES);
  if (transmission) filter.eq.transmission = transmission;

  const cityId = parseUuid(query.city);
  if (cityId) filter.eq.city_id = cityId;

  applyPriceRange(filter, query.minPrice, query.maxPrice);

  const minYear = parsePositiveInt(query.minYear);
  const maxYear = parsePositiveInt(query.maxYear);
  if (minYear != null) filter.gte.year = minYear;
  if (maxYear != null) filter.lte.year = maxYear;

  const maxKm = parsePositiveInt(query.maxKm);
  if (maxKm != null) filter.lte.kilometers = maxKm;

  applyTextSearch(filter, query, ['description', 'make', 'model', 'variant']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildSort(sort, 'price', featuredBoostForQuery(query)) };
}

function parseJobFilters(query) {
  const filter = mergeSpecs(activeJobCreatedAtFilter(), { eq: {} });

  const industry = parseAllowedFromArray(query.industry, INDUSTRY_VALUES);
  if (industry) filter.eq.industry = industry;

  const jobType = parseAllowedFromArray(query.jobType, JOB_TYPE_VALUES);
  if (jobType) filter.eq.job_type = jobType;

  const workLocation = parseAllowedFromArray(query.workLocation, WORK_LOCATION_VALUES);
  if (workLocation) filter.eq.work_location = workLocation;

  const education = parseAllowedFromArray(query.education, EDUCATION_VALUES);
  if (education) filter.eq.education = education;

  const experience = parseAllowedFromArray(query.experience, EXPERIENCE_VALUES);
  if (experience) filter.eq.experience = experience;

  const cityId = parseUuid(query.city);
  if (cityId) filter.eq.city_id = cityId;

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildSort(sort, 'salary', featuredBoostForQuery(query)) };
}

function parseMarketplaceFilters(query) {
  const filter = { eq: {}, gte: {}, lte: {} };

  const cat = parseAllowedFromArray(query.cat || query.category, MARKETPLACE_CATEGORY_VALUES);
  if (cat) filter.eq.category = cat;

  const condition = parseAllowedFromArray(query.condition, MARKETPLACE_CONDITION_VALUES);
  if (condition) filter.eq.condition = condition;

  const cityId = parseUuid(query.city);
  if (cityId) filter.eq.city_id = cityId;

  applyPriceRange(filter, query.minPrice, query.maxPrice);
  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseSort(query.sort);
  return { filter, sort: buildSort(sort, 'price', featuredBoostForQuery(query)) };
}

function parseOnFlag(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function parseMinRating(value) {
  const n = Number.parseFloat(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

function parseDirectorySort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'rating-desc' || raw === 'rating-asc') return raw;
  return parseSort(value);
}

async function loadVerifiedPosterIds() {
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .or('jobs_employer_verified_at.not.is.null,professionals_verified_at.not.is.null');
  if (error) throw error;
  return (data || []).map((row) => row.id).filter(Boolean);
}

async function applyVerifiedPosterFilter(filter, query) {
  if (!parseOnFlag(query.verified)) return filter;
  const ids = await loadVerifiedPosterIds();
  return mergeSpecs(filter, { in: { poster_id: ids.length ? ids : [EMPTY_IN_UUID] } });
}

async function listingIdsMeetingMinRating(reviewTable, minRating) {
  const { data, error } = await getSupabaseAdmin().from(reviewTable).select('listing_id, rating');
  if (error) throw error;
  return rankListingIdsByReviews(data)
    .filter((row) => row.ratingAverage + 1e-9 >= minRating)
    .map((row) => row.id);
}

async function applyDirectoryExtras(filter, query, vertical) {
  let next = filter;
  if (parseOnFlag(query.announcement)) {
    next = mergeSpecs(next, {
      notNull: ['announcement_title'],
      neq: { announcement_title: '' },
    });
  }
  if (vertical === 'businesses' && parseOnFlag(query.reservations)) {
    next = mergeSpecs(next, { eq: { reservations_enabled: true } });
  }
  if (vertical === 'professionals' && parseOnFlag(query.fastResponse)) {
    next = mergeSpecs(next, { lte: { response_time_hours: 24 } });
  }
  const minRating = parseMinRating(query.minRating);
  if (minRating != null) {
    const reviewTable =
      vertical === 'businesses' ? 'business_listing_reviews' : 'professional_listing_reviews';
    const ids = await listingIdsMeetingMinRating(reviewTable, minRating);
    next = mergeSpecs(next, { in: { id: ids.length ? ids : [EMPTY_IN_UUID] } });
  }
  return next;
}

/** Keyword locations + verified / directory extras. */
async function finalizeBrowseFilter(filter, query, { vertical } = {}) {
  let next = await finalizeTextSearch(filter, query);
  next = await applyVerifiedPosterFilter(next, query);
  if (vertical === 'businesses' || vertical === 'professionals') {
    next = await applyDirectoryExtras(next, query, vertical);
  }
  return next;
}

function parseDirectoryFilters(query, vertical) {
  const filter = { eq: { vertical } };
  const allowed =
    vertical === 'businesses'
      ? BUSINESS_CATEGORIES
      : PROFESSIONAL_CATEGORIES;

  const type = parseAllowedString(query.type || query.cat || query.category, allowed);
  if (type) filter.eq.category = type;

  const cityId = parseUuid(query.city);
  if (cityId) filter.eq.city_id = cityId;

  applyTextSearch(filter, query, ['title', 'description']);

  const sort = parseDirectorySort(query.sort);
  return { filter, sort: buildDirectorySort(sort, featuredBoostForQuery(query)) };
}

module.exports = {
  MARKETPLACE_CATEGORY_VALUES,
  MARKETPLACE_CONDITION_VALUES,
  parseRealEstateFilters,
  parseCarFilters,
  parseJobFilters,
  parseMarketplaceFilters,
  parseDirectoryFilters,
  finalizeTextSearch,
  finalizeBrowseFilter,
};
