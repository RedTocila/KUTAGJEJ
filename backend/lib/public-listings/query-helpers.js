const { getSupabaseAdmin } = require('../supabase');
const { camelizeRows } = require('../profiles');
const { DEFAULT_LIMIT, MAX_LIMIT, JOB_LISTING_VISIBLE_DAYS, MS_PER_DAY } = require('./constants');

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
function applyFilterSpec(query, spec = {}) {
  let q = query;
  if (spec.eq) for (const [col, val] of Object.entries(spec.eq)) q = q.eq(col, val);
  if (spec.neq) for (const [col, val] of Object.entries(spec.neq)) q = q.neq(col, val);
  if (spec.gte) for (const [col, val] of Object.entries(spec.gte)) q = q.gte(col, val);
  if (spec.lte) for (const [col, val] of Object.entries(spec.lte)) q = q.lte(col, val);
  if (spec.gt) for (const [col, val] of Object.entries(spec.gt)) q = q.gt(col, val);
  if (spec.lt) for (const [col, val] of Object.entries(spec.lt)) q = q.lt(col, val);
  if (spec.in) for (const [col, val] of Object.entries(spec.in)) q = q.in(col, val);
  if (spec.or) q = q.or(spec.or);
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
    if (spec.or) out.or = out.or ? `${out.or},${spec.or}` : spec.or;
  }
  return out;
}

function applySort(query, sortSpec = []) {
  let q = query;
  for (const s of sortSpec) q = q.order(s.column, { ascending: s.ascending, nullsFirst: false });
  return q;
}

const SORT_VALUES = new Set(['newest', 'price-asc', 'price-desc']);

function parseSort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return SORT_VALUES.has(raw) ? raw : 'newest';
}

/** Active Premium listings (premium_until in the future) float above the rest. */
function premiumSortPrefix() {
  return [{ column: 'premium_until', ascending: false, nullsFirst: false }];
}

function buildSort(sort, field = 'price') {
  const premiumFirst = premiumSortPrefix();
  if (sort === 'price-asc') {
    return [...premiumFirst, { column: field, ascending: true }, { column: 'created_at', ascending: false }];
  }
  if (sort === 'price-desc') {
    return [...premiumFirst, { column: field, ascending: false }, { column: 'created_at', ascending: false }];
  }
  return [...premiumFirst, { column: 'created_at', ascending: false }];
}

/** Strip premium_until from a sort spec (fallback when the column is not migrated yet). */
function withoutPremiumSort(sortSpec = []) {
  return (sortSpec || []).filter((s) => s.column !== 'premium_until');
}

function isPremiumActive(doc) {
  if (!doc) return false;
  const raw = doc.premiumUntil ?? doc.premium_until ?? null;
  if (!raw) return false;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) && ts > Date.now();
}

/**
 * Stable partition: active Premium first (keeping relative order), then the rest.
 * Needed because DB order by premium_until also floats *expired* timestamps above nulls.
 */
function prioritizeActivePremium(docs) {
  if (!Array.isArray(docs) || docs.length === 0) return docs || [];
  const premium = [];
  const rest = [];
  for (const doc of docs) {
    if (isPremiumActive(doc)) premium.push(doc);
    else rest.push(doc);
  }
  return [...premium, ...rest];
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

/** Builds a `.or()` filter string matching any of `fields` against `q` (case-insensitive substring). */
function buildIlikeOrFilter(fields, q) {
  const term = String(q ?? '').trim();
  if (term.length < 2 || term.length > 80) return null;
  const likeValue = `%${escapeIlikeValue(term)}%`;
  const value = escapeOrValue(likeValue);
  return fields.map((field) => `${field}.ilike.${value}`).join(',');
}

/** Loads `real_estate_cities` rows referenced by `cityId` on a list of camelCase docs. */
async function buildCityIndex(docs) {
  const cityIds = [...new Set((docs || []).map((d) => d.cityId).filter(Boolean))];
  if (cityIds.length === 0) return new Map();
  const { data, error } = await getSupabaseAdmin().from('real_estate_cities').select('*').in('id', cityIds);
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
  buildSort,
  withoutPremiumSort,
  isPremiumActive,
  prioritizeActivePremium,
  buildIlikeOrFilter,
  buildCityIndex,
};
