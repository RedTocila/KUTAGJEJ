const { getSupabaseAdmin } = require('../supabase');
const { camelizeRows } = require('../profiles');
const { DEFAULT_LIMIT, MAX_LIMIT, JOB_LISTING_VISIBLE_DAYS, MS_PER_DAY } = require('./constants');
const { expandSearchTerms, namesMatch, normalizeSearchText } = require('../search-normalize');
const { hasPremiumUntilColumn } = require('../ensure-premium-listing-schema');
const { hasBumpedAtColumn } = require('../ensure-bumped-at-schema');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function jobListingExpiresAt(createdAt) {
  const posted = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(posted.getTime() + JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY);
}

function isJobListingActive(doc) {
  return Date.now() < jobListingExpiresAt(doc.createdAt).getTime();
}

/** FilterSpec fragment restricting job listings to the still-visible window. */
function activeJobCreatedAtFilter() {
  const cutoff = new Date(Date.now() - JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY).toISOString();
  return { gte: { created_at: cutoff } };
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

/**
 * A FilterSpec is a plain descriptor applied to a Supabase query builder via
 * `applyFilterSpec`: `{ eq, neq, gte, lte, gt, lt, in, or }`, each of
 * `eq`/`neq`/`gte`/`lte`/`gt`/`lt`/`in` being `{ column: value }` maps, and
 * `or` a raw PostgREST `.or()` filter string.
 */
const EMPTY_IN_UUID = '00000000-0000-0000-0000-000000000000';

function applyFilterSpec(query, spec = {}) {
  let q = query;
  if (spec.eq) for (const [col, val] of Object.entries(spec.eq)) q = q.eq(col, val);
  if (spec.neq) for (const [col, val] of Object.entries(spec.neq)) q = q.neq(col, val);
  if (spec.gte) for (const [col, val] of Object.entries(spec.gte)) q = q.gte(col, val);
  if (spec.lte) for (const [col, val] of Object.entries(spec.lte)) q = q.lte(col, val);
  if (spec.gt) for (const [col, val] of Object.entries(spec.gt)) q = q.gt(col, val);
  if (spec.lt) for (const [col, val] of Object.entries(spec.lt)) q = q.lt(col, val);
  if (spec.in) {
    for (const [col, val] of Object.entries(spec.in)) {
      const arr = Array.isArray(val) ? val : [val];
      q = q.in(col, arr.length ? arr : [EMPTY_IN_UUID]);
    }
  }
  if (spec.notNull) {
    for (const col of spec.notNull) q = q.not(col, 'is', null);
  }
  const andOr = Array.isArray(spec.andOr) ? spec.andOr.filter(Boolean) : [];
  if (andOr.length > 1) {
    q = q.or(`and(${andOr.map((or) => `or(${or})`).join(',')})`);
  } else if (andOr.length === 1) {
    q = q.or(andOr[0]);
  } else if (spec.or) {
    q = q.or(spec.or);
  }
  return q;
}

/** Shallow-merges FilterSpec fragments; later fragments win on key conflicts. */
function mergeSpecs(...specs) {
  const out = {};
  for (const spec of specs) {
    if (!spec) continue;
    for (const key of ['eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'in']) {
      if (spec[key]) out[key] = { ...(out[key] || {}), ...spec[key] };
    }
    if (spec.notNull) {
      out.notNull = [...new Set([...(out.notNull || []), ...spec.notNull])];
    }
    if (spec.or) out.or = out.or ? `${out.or},${spec.or}` : spec.or;
    if (Array.isArray(spec.andOr) && spec.andOr.length) {
      out.andOr = [...(out.andOr || []), ...spec.andOr.filter(Boolean)];
    }
  }
  return out;
}

function applySort(query, sortSpec = []) {
  let q = query;
  for (const s of sortSpec) q = q.order(s.column, { ascending: s.ascending, nullsFirst: false });
  return q;
}

const SORT_VALUES = new Set(['newest', 'price-asc', 'price-desc']);

function isRatingSortSpec(sortSpec = []) {
  return Array.isArray(sortSpec) && sortSpec.some((s) => s.column === 'rating_average');
}

/** Aggregate review rows into ranking entries (avg rating, then review count). */
function rankListingIdsByReviews(rows) {
  const sums = new Map();
  for (const row of rows || []) {
    const id = String(row.listing_id || '');
    if (!id) continue;
    const entry = sums.get(id) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(row.rating) || 0;
    sums.set(id, entry);
  }

  return [...sums.entries()]
    .map(([id, entry]) => ({
      id,
      reviewCount: entry.count,
      ratingAverage: entry.count > 0 ? entry.total / entry.count : 0,
    }))
    .sort((a, b) => {
      if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
      return b.reviewCount - a.reviewCount;
    });
}

function parseSort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return SORT_VALUES.has(raw) ? raw : 'newest';
}

/** Active OKAZION, then Premium, float above the rest (sellable ads). */
function premiumSortPrefix({ includeOkazion = true, includePremium = true } = {}) {
  const prefix = [];
  if (includeOkazion) {
    prefix.push({ column: 'okazion_until', ascending: false, nullsFirst: false });
  }
  // null = not probed yet → include and let runListingQuery fall back on error
  if (includePremium && hasPremiumUntilColumn() !== false) {
    prefix.push({ column: 'premium_until', ascending: false, nullsFirst: false });
  }
  return prefix;
}

function newestTimestampColumn() {
  // null = not probed yet → prefer bumped_at; runListingQuery falls back on error
  if (hasBumpedAtColumn() === false) return 'created_at';
  return 'bumped_at';
}

function buildSort(sort, field = 'price', { includeOkazion = true, includePremium = true } = {}) {
  const premiumFirst = premiumSortPrefix({ includeOkazion, includePremium });
  const newestCol = newestTimestampColumn();
  if (sort === 'price-asc') {
    return [...premiumFirst, { column: field, ascending: true }, { column: newestCol, ascending: false }];
  }
  if (sort === 'price-desc') {
    return [...premiumFirst, { column: field, ascending: false }, { column: newestCol, ascending: false }];
  }
  return [...premiumFirst, { column: newestCol, ascending: false }];
}

/** Directory profiles (businesses / professionals) — Premium only, no OKAZION. */
function buildDirectorySort(sort, { includePremium = true } = {}) {
  if (sort === 'rating-desc') return [{ column: 'rating_average', ascending: false }];
  if (sort === 'rating-asc') return [{ column: 'rating_average', ascending: true }];
  return buildSort(sort, 'price', { includeOkazion: false, includePremium });
}

/** Strip featured-until columns from a sort spec (fallback when not migrated yet). */
function withoutPremiumSort(sortSpec = []) {
  return (sortSpec || []).filter(
    (s) => s.column !== 'premium_until' && s.column !== 'okazion_until',
  );
}

/** Replace bumped_at sort keys with created_at when the column is missing. */
function withoutBumpedAtSort(sortSpec = []) {
  return (sortSpec || []).map((s) =>
    s.column === 'bumped_at' ? { ...s, column: 'created_at' } : s,
  );
}

function isPremiumActive(doc) {
  if (!doc) return false;
  const raw = doc.premiumUntil ?? doc.premium_until ?? null;
  if (!raw) return false;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

function isOkazionActive(doc) {
  if (!doc) return false;
  const raw = doc.okazionUntil ?? doc.okazion_until ?? null;
  if (!raw) return false;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

/** Feed-order timestamp: last bump, else publish time. */
function listingBumpMs(doc) {
  const raw = doc?.bumpedAt ?? doc?.bumped_at ?? doc?.createdAt ?? doc?.created_at ?? null;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function sortDocsByBumpDesc(docs) {
  return [...docs].sort((a, b) => listingBumpMs(b) - listingBumpMs(a));
}

/**
 * Stable partition: active OKAZION first, then Premium, then the rest.
 * Needed because DB order by *_until also floats *expired* timestamps above nulls.
 * When `sortRestByBump` is true (category "newest" browse), each tier is
 * re-sorted by bumped_at so refresh / new posts sit on top within OKAZION,
 * Premium, and free listings respectively.
 */
function prioritizeActivePremium(docs, { sortRestByBump = false } = {}) {
  if (!Array.isArray(docs) || docs.length === 0) return docs || [];
  const okazion = [];
  const premium = [];
  const rest = [];
  for (const doc of docs) {
    if (isOkazionActive(doc)) okazion.push(doc);
    else if (isPremiumActive(doc)) premium.push(doc);
    else rest.push(doc);
  }
  if (sortRestByBump) {
    return [
      ...sortDocsByBumpDesc(okazion),
      ...sortDocsByBumpDesc(premium),
      ...sortDocsByBumpDesc(rest),
    ];
  }
  return [...okazion, ...premium, ...rest];
}

function escapeIlikeValue(value) {
  return String(value).replace(/[%_\\]/g, '\\$&');
}

/** Wraps a value for a PostgREST `.or()` filter, quoting if it contains reserved characters. */
function escapeOrValue(value) {
  const needsQuotes = /[,()]/.test(value);
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Short queries like "for" match too many descriptions (`%for%` → "for sale").
 * Keep description matching for longer, intentional keyword searches only.
 */
const DESCRIPTION_SEARCH_MIN_LENGTH = 4;

function fieldsForTextSearch(fields, q) {
  const list = Array.isArray(fields) ? fields.filter(Boolean) : [];
  if (!list.length) return list;
  const needle = String(q ?? '').trim();
  if (needle.length >= DESCRIPTION_SEARCH_MIN_LENGTH) return list;
  const withoutDescription = list.filter((f) => f !== 'description');
  return withoutDescription.length ? withoutDescription : list;
}

/** Builds a `.or()` filter string matching any of `fields` against `q` (case-insensitive substring). */
function buildIlikeOrFilter(fields, q) {
  const terms = expandSearchTerms(q);
  const searchFields = fieldsForTextSearch(fields, q);
  if (!terms.length || !searchFields.length) return null;

  const parts = [];
  for (const term of terms) {
    const likeValue = `%${escapeIlikeValue(term)}%`;
    const value = escapeOrValue(likeValue);
    for (const field of searchFields) {
      parts.push(`${field}.ilike.${value}`);
    }
  }
  return parts.length ? parts.join(',') : null;
}

/** Flatten `q` from a string or repeated query values into unique keywords. */
function parseQueryKeywords(query) {
  const raw = query?.q;
  const values = Array.isArray(raw) ? raw : raw != null && String(raw).trim() !== '' ? [raw] : [];
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const trimmed = String(value ?? '').trim();
    if (trimmed.length < 2) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

async function locationOrForNeedle(q) {
  const needle = normalizeSearchText(q);
  if (!needle || needle.length < 2) return null;

  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id, name, zones');
  if (error) throw error;
  if (!data?.length) return null;

  const cityIds = new Set();
  const zoneIds = new Set();

  for (const city of data) {
    if (namesMatch(needle, city.name)) {
      cityIds.add(city.id);
    }
    const zones = Array.isArray(city.zones) ? city.zones : [];
    for (const zone of zones) {
      const zoneName = zone?.name;
      if (!zoneName || !namesMatch(needle, zoneName)) continue;
      zoneIds.add(zone.id);
      cityIds.add(city.id);
    }
  }

  const locationParts = [];
  for (const id of cityIds) locationParts.push(`city_id.eq.${id}`);
  for (const id of zoneIds) locationParts.push(`zone_id.eq.${id}`);
  return locationParts.length ? locationParts.join(',') : null;
}

/**
 * Resolve free-text `q` to city/zone ids (accent + English-alias tolerant).
 * Appends `city_id.eq` / `zone_id.eq` clauses onto `spec.or` so location names find listings.
 */
async function enrichTextSearchWithLocations(spec, q) {
  const locationOr = await locationOrForNeedle(q);
  if (!locationOr) return spec;

  if (Array.isArray(spec.andOr) && spec.andOr.length) {
    const groups = [...spec.andOr];
    groups[0] = `${groups[0]},${locationOr}`;
    return { ...spec, andOr: groups };
  }

  return {
    ...spec,
    or: spec.or ? `${spec.or},${locationOr}` : locationOr,
  };
}

/** Loads `real_estate_cities` rows referenced by `cityId` on a list of camelCase docs. */
async function buildCityIndex(docs) {
  const cityIds = [...new Set((docs || []).map((d) => d.cityId).filter(Boolean))];
  if (cityIds.length === 0) return new Map();
  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id, name, zones')
    .in('id', cityIds);
  if (error) throw error;
  const cities = camelizeRows(data);
  return new Map(cities.map((c) => [c.id, c]));
}

module.exports = {
  isUuid,
  jobListingExpiresAt,
  isJobListingActive,
  activeJobCreatedAtFilter,
  clampLimit,
  parsePagination,
  calcTotalPages,
  buildPaginatedResponse,
  applyFilterSpec,
  mergeSpecs,
  applySort,
  parseSort,
  isRatingSortSpec,
  rankListingIdsByReviews,
  EMPTY_IN_UUID,
  buildSort,
  buildDirectorySort,
  withoutPremiumSort,
  withoutBumpedAtSort,
  newestTimestampColumn,
  isPremiumActive,
  isOkazionActive,
  listingBumpMs,
  sortDocsByBumpDesc,
  prioritizeActivePremium,
  buildIlikeOrFilter,
  parseQueryKeywords,
  fieldsForTextSearch,
  enrichTextSearchWithLocations,
  locationOrForNeedle,
  buildCityIndex,
};
