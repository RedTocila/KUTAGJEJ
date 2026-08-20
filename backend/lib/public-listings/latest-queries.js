'use strict';

const { getSupabaseAdmin } = require('../supabase');
const { camelizeRows } = require('../profiles');
const { attachMetricsToListings, attachMetricsToListing, fetchMetricsMap, saverFromUser } = require('../listing-metrics');
const { reviewStatsByListingIds } = require('../business-review-stats');
const { professionalReviewStatsByListingIds } = require('../professional-review-stats');
const {
  activeJobCreatedAtFilter,
  buildCityIndex,
  applyFilterSpec,
  applySort,
  buildSort,
  buildDirectorySort,
  buildIlikeOrFilter,
  mergeSpecs,
  isUuid,
  isRatingSortSpec,
  rankListingIdsByReviews,
  prioritizeActivePremium,
  withoutPremiumSort,
  withoutBumpedAtSort,
  newestTimestampColumn,
} = require('./query-helpers');
const { mergePublicFilter } = require('../listing-moderation');
const { hasBumpedAtColumn } = require('../ensure-bumped-at-schema');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./formatters');
const { loadVerifiedPosterIdSet, loadTrustBadgePosterIdSet } = require('./load-poster-brief');

const TABLE_BY_KIND = {
  'real-estate': 'real_estate_listings',
  car: 'car_listings',
  job: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
};

/** Card-only columns — avoids shipping gallery arrays, menus, portfolios, admin fields. */
const LIST_SELECT_BY_TABLE = {
  real_estate_listings: [
    'id',
    'title',
    'description',
    'property_category',
    'transaction_type',
    'price',
    'original_price',
    'currency',
    'surface_m2',
    'city_id',
    'zone_id',
    'bedrooms',
    'bathrooms',
    'floor',
    'furnishing',
    'year_built',
    'condition',
    'contact_phone',
    'image_urls',
    'permalink_slug',
    'premium_until',
    'okazion_until',
    'status',
    'created_at',
    'bumped_at',
    'poster_id',
  ].join(','),
  car_listings: [
    'id',
    'description',
    'vehicle_type',
    'make',
    'model',
    'variant',
    'year',
    'kilometers',
    'transmission',
    'fuel_type',
    'price',
    'original_price',
    'currency',
    'color',
    'city_id',
    'contact_phone',
    'image_urls',
    'permalink_slug',
    'premium_until',
    'okazion_until',
    'status',
    'created_at',
    'bumped_at',
    'poster_id',
  ].join(','),
  job_listings: [
    'id',
    'title',
    'description',
    'industry',
    'education',
    'experience',
    'job_type',
    'work_location',
    'salary',
    'currency',
    'city_id',
    'contact_phone',
    'image_urls',
    'permalink_slug',
    'premium_until',
    'okazion_until',
    'status',
    'created_at',
    'bumped_at',
    'poster_id',
  ].join(','),
  marketplace_listings: [
    'id',
    'transaction_type',
    'title',
    'description',
    'category',
    'condition',
    'price',
    'original_price',
    'currency',
    'city_id',
    'contact_phone',
    'image_urls',
    'permalink_slug',
    'premium_until',
    'okazion_until',
    'status',
    'created_at',
    'bumped_at',
    'poster_id',
  ].join(','),
  directory_listings: [
    'id',
    'vertical',
    'title',
    'description',
    'category',
    'condition',
    'price',
    'currency',
    'opening_hours',
    'weekly_hours',
    'reservations_enabled',
    'reservation_url',
    'mobile_cta_mode',
    'services_highlight',
    'response_time_hours',
    'city_id',
    'zone_id',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
    'contact_phone',
    'image_urls',
    'permalink_slug',
    'premium_until',
    'announcement_title',
    'announcement_subtitle',
    'announcement_banner_url',
    'status',
    'created_at',
    'bumped_at',
    'poster_id',
  ].join(','),
};

function listSelectForTable(table) {
  const base = LIST_SELECT_BY_TABLE[table] || '*';
  if (hasBumpedAtColumn() === false && typeof base === 'string') {
    return base
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c && c !== 'bumped_at')
      .join(',');
  }
  return base;
}

function baseFilterForKind(kind) {
  if (kind === 'job') return activeJobCreatedAtFilter();
  if (kind === 'businesses' || kind === 'professionals') return { eq: { vertical: kind } };
  return {};
}

function sortLooksPremium(sortSpec) {
  return (
    Array.isArray(sortSpec) &&
    sortSpec.some((s) => s.column === 'premium_until' || s.column === 'okazion_until')
  );
}

/** True when browse sort is chronological (newest feed), not price/rating. */
function sortIsNewestFeed(sortSpec = []) {
  const nonFeatured = (sortSpec || []).filter(
    (s) => s.column !== 'premium_until' && s.column !== 'okazion_until',
  );
  if (!nonFeatured.length) return true;
  const col = nonFeatured[0].column;
  return col === 'bumped_at' || col === 'created_at';
}

async function runListingQuery(table, filterSpec, sortSpec, limit, skip = 0) {
  const sb = getSupabaseAdmin();
  const effectiveSort = sortSpec && sortSpec.length ? sortSpec : buildSort('newest');

  const run = async (spec, selectOverride) => {
    let q = applyFilterSpec(
      sb.from(table).select(selectOverride || listSelectForTable(table)),
      filterSpec,
    );
    q = applySort(q, spec);
    if (limit > 0) q = q.range(skip, skip + limit - 1);
    return q;
  };

  let { data, error } = await run(effectiveSort);
  if (
    error &&
    sortLooksPremium(effectiveSort) &&
    /(premium_until|okazion_until)/i.test(String(error.message || ''))
  ) {
    ({ data, error } = await run(withoutPremiumSort(effectiveSort)));
  }
  if (error && /bumped_at/i.test(String(error.message || ''))) {
    const selectWithoutBump = (LIST_SELECT_BY_TABLE[table] || '*')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c && c !== 'bumped_at')
      .join(',');
    ({ data, error } = await run(
      withoutBumpedAtSort(withoutPremiumSort(effectiveSort)),
      selectWithoutBump,
    ));
  }
  if (error) throw error;
  const rows = camelizeRows(data);
  // Only re-pin featured ads when the sort intentionally boosts them (browse/home).
  // Keyword search uses chronological/price sort — keep that order.
  return sortLooksPremium(effectiveSort)
    ? prioritizeActivePremium(rows, { sortRestByBump: sortIsNewestFeed(effectiveSort) })
    : rows;
}

async function countListingQuery(table, filterSpec) {
  const sb = getSupabaseAdmin();
  let q = applyFilterSpec(sb.from(table).select('*', { count: 'exact', head: true }), filterSpec);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

function applySellerBadges(docs, listings, verifiedIds, trustIds) {
  return listings.map((listing, i) => {
    const posterId = docs[i]?.posterId ? String(docs[i].posterId) : '';
    return {
      ...listing,
      sellerVerified: Boolean(posterId && verifiedIds.has(posterId)),
      sellerTrustBadge: Boolean(posterId && trustIds.has(posterId)),
    };
  });
}

function formatDocsLocal(kind, docs, cityById, reviewStats) {
  if (kind === 'real-estate') return docs.map((d) => formatRealEstate(d, cityById));
  if (kind === 'car') return docs.map((d) => formatCar(d, cityById));
  if (kind === 'job') return docs.map((d) => formatJob(d, cityById));
  if (kind === 'marketplace') return docs.map((d) => formatMarketplace(d, cityById));
  return docs.map((d) => formatDirectory(d, cityById, reviewStats));
}

async function formatDocsForKind(kind, docs) {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const needsBiz = kind === 'businesses';
  const needsPro = kind === 'professionals';
  const [cityById, reviewStats] = await Promise.all([
    buildCityIndex(docs),
    needsBiz
      ? reviewStatsByListingIds(docs.map((d) => d.id))
      : needsPro
        ? professionalReviewStatsByListingIds(docs.map((d) => d.id))
        : Promise.resolve(null),
  ]);
  const formatted = formatDocsLocal(kind, docs, cityById, reviewStats);
  const [withMetrics, verifiedIds, trustIds] = await Promise.all([
    attachMetricsToListings(formatted),
    loadVerifiedPosterIdSet(docs.map((d) => d.posterId)),
    loadTrustBadgePosterIdSet(docs.map((d) => d.posterId)),
  ]);
  return applySellerBadges(docs, withMetrics, verifiedIds, trustIds);
}

const LATEST_VERTICAL_SPECS = [
  { key: 'realEstate', kind: 'real-estate', table: 'real_estate_listings', filter: {}, sort: () => buildSort('newest') },
  { key: 'cars', kind: 'car', table: 'car_listings', filter: {}, sort: () => buildSort('newest') },
  {
    key: 'jobs',
    kind: 'job',
    table: 'job_listings',
    filter: activeJobCreatedAtFilter(),
    sort: () => buildSort('newest'),
  },
  { key: 'marketplace', kind: 'marketplace', table: 'marketplace_listings', filter: {}, sort: () => buildSort('newest') },
  {
    key: 'businesses',
    kind: 'businesses',
    table: 'directory_listings',
    filter: { eq: { vertical: 'businesses' } },
    sort: () => buildDirectorySort('newest'),
  },
  {
    key: 'professionals',
    kind: 'professionals',
    table: 'directory_listings',
    filter: { eq: { vertical: 'professionals' } },
    sort: () => buildDirectorySort('newest'),
  },
];

/**
 * Newest card rows for every homepage vertical — one shared city/metrics/badge round-trip.
 * No exact counts, no OKAZION. Used by `/public/listings/recommended`.
 */
async function queryLatestVerticals(limit) {
  const docGroups = await Promise.all(
    LATEST_VERTICAL_SPECS.map((spec) =>
      runListingQuery(spec.table, mergePublicFilter(spec.filter), spec.sort(), limit, 0),
    ),
  );

  const allDocs = docGroups.flat();
  const bizDocs = docGroups[4] || [];
  const proDocs = docGroups[5] || [];
  const [cityById, bizReviews, proReviews] = await Promise.all([
    buildCityIndex(allDocs),
    reviewStatsByListingIds(bizDocs.map((d) => d.id)),
    professionalReviewStatsByListingIds(proDocs.map((d) => d.id)),
  ]);

  const formattedGroups = docGroups.map((docs, i) => {
    const kind = LATEST_VERTICAL_SPECS[i].kind;
    const reviewStats =
      kind === 'businesses' ? bizReviews : kind === 'professionals' ? proReviews : null;
    return formatDocsLocal(kind, docs, cityById, reviewStats);
  });

  const allFormatted = formattedGroups.flat();
  const [withMetrics, verifiedIds, trustIds] = await Promise.all([
    attachMetricsToListings(allFormatted),
    loadVerifiedPosterIdSet(allDocs.map((d) => d.posterId)),
    loadTrustBadgePosterIdSet(allDocs.map((d) => d.posterId)),
  ]);

  const bundle = {};
  let offset = 0;
  for (let i = 0; i < LATEST_VERTICAL_SPECS.length; i += 1) {
    const docs = docGroups[i];
    const slice = withMetrics.slice(offset, offset + docs.length);
    offset += docs.length;
    bundle[LATEST_VERTICAL_SPECS[i].key] = applySellerBadges(docs, slice, verifiedIds, trustIds);
  }
  return bundle;
}

/**
 * Top businesses/professionals by star rating (avg, then review count).
 * Falls back to newest approved listings when review data is sparse.
 */
async function topRatedDirectoryByKind(kind, limit) {
  const table = TABLE_BY_KIND[kind];
  if (!table || limit <= 0) return [];
  if (kind !== 'businesses' && kind !== 'professionals') return [];

  const reviewTable =
    kind === 'businesses' ? 'business_listing_reviews' : 'professional_listing_reviews';
  const baseFilter = baseFilterForKind(kind);
  const sb = getSupabaseAdmin();

  const { data: reviews, error: revErr } = await sb.from(reviewTable).select('listing_id, rating');
  if (revErr) throw revErr;

  const ranked = rankListingIdsByReviews(reviews);
  const orderedDocs = [];
  const seen = new Set();

  const candidateIds = ranked
    .slice(0, Math.max(limit * 3, 20))
    .map((r) => r.id)
    .filter(isUuid);

  if (candidateIds.length) {
    const filter = mergePublicFilter(mergeSpecs(baseFilter, { in: { id: candidateIds } }));
    const docs = await runListingQuery(table, filter, [], candidateIds.length, 0);
    const byId = new Map(docs.map((d) => [String(d.id), d]));
    for (const r of ranked) {
      const doc = byId.get(String(r.id));
      if (!doc) continue;
      const id = String(doc.id);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedDocs.push(doc);
      if (orderedDocs.length >= limit) break;
    }
  }

  if (orderedDocs.length < limit) {
    const fillers = await runListingQuery(
      table,
      mergePublicFilter(baseFilter),
      buildDirectorySort('newest'),
      limit * 2,
      0,
    );
    for (const doc of fillers) {
      const id = String(doc.id);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedDocs.push(doc);
      if (orderedDocs.length >= limit) break;
    }
  }

  if (orderedDocs.length === 0) return [];
  // Keep pure rating order — do not float OKAZION/Premium above higher-rated listings.
  return formatDocsForKind(kind, orderedDocs);
}

/**
 * Top listings for a vertical by view count (listing_engagements).
 * Businesses & professionals use star ratings instead.
 * Falls back to newest approved listings when engagement/review data is sparse.
 */
async function topViewedByKind(kind, limit) {
  if (kind === 'businesses' || kind === 'professionals') {
    return topRatedDirectoryByKind(kind, limit);
  }

  const table = TABLE_BY_KIND[kind];
  if (!table || limit <= 0) return [];

  const baseFilter = baseFilterForKind(kind);
  const sb = getSupabaseAdmin();

  const { data: engagements, error: engErr } = await sb
    .from('listing_engagements')
    .select('listing_id, view_count')
    .eq('listing_kind', kind)
    .gt('view_count', 0)
    .order('view_count', { ascending: false })
    .limit(Math.max(limit * 3, 20));
  if (engErr) throw engErr;

  const orderedDocs = [];
  const seen = new Set();

  if (engagements && engagements.length > 0) {
    const ids = engagements.map((e) => e.listing_id).filter(isUuid);
    if (ids.length) {
      const filter = mergePublicFilter(mergeSpecs(baseFilter, { in: { id: ids } }));
      const docs = await runListingQuery(table, filter, [], ids.length, 0);
      const byId = new Map(docs.map((d) => [String(d.id), d]));
      for (const e of engagements) {
        const doc = byId.get(String(e.listing_id));
        if (!doc) continue;
        const id = String(doc.id);
        if (seen.has(id)) continue;
        seen.add(id);
        orderedDocs.push(doc);
        if (orderedDocs.length >= limit) break;
      }
    }
  }

  if (orderedDocs.length < limit) {
    const fillers = await runListingQuery(
      table,
      mergePublicFilter(baseFilter),
      buildSort('newest'),
      limit * 2,
      0,
    );
    for (const doc of fillers) {
      const id = String(doc.id);
      if (seen.has(id)) continue;
      seen.add(id);
      orderedDocs.push(doc);
      if (orderedDocs.length >= limit) break;
    }
  }

  if (orderedDocs.length === 0) return [];
  return formatDocsForKind(kind, prioritizeActivePremium(orderedDocs));
}

async function queryRealEstate(limit, filter = {}, sort = null, skip = 0) {
  const docs = await runListingQuery(
    'real_estate_listings',
    mergePublicFilter(filter),
    sort,
    limit,
    skip,
  );
  return formatDocsForKind('real-estate', docs);
}

async function countRealEstate(filter = {}) {
  return countListingQuery('real_estate_listings', mergePublicFilter(filter));
}

async function queryCars(limit, filter = {}, sort = null, skip = 0) {
  const docs = await runListingQuery('car_listings', mergePublicFilter(filter), sort, limit, skip);
  return formatDocsForKind('car', docs);
}

async function countCars(filter = {}) {
  return countListingQuery('car_listings', mergePublicFilter(filter));
}

async function queryJobs(limit, filter, sort = null, skip = 0) {
  const docs = await runListingQuery(
    'job_listings',
    mergePublicFilter(filter ?? activeJobCreatedAtFilter()),
    sort,
    limit,
    skip,
  );
  return formatDocsForKind('job', docs);
}

async function countJobs(filter) {
  return countListingQuery('job_listings', mergePublicFilter(filter ?? activeJobCreatedAtFilter()));
}

async function countActiveJobs() {
  return countJobs(activeJobCreatedAtFilter());
}

async function queryMarketplace(limit, filter = {}, sort = null, skip = 0) {
  const docs = await runListingQuery(
    'marketplace_listings',
    mergePublicFilter(filter),
    sort,
    limit,
    skip,
  );
  return formatDocsForKind('marketplace', docs);
}

async function countMarketplace(filter = {}) {
  return countListingQuery('marketplace_listings', mergePublicFilter(filter));
}

async function queryDirectoryOrderedByRating(vertical, limit, filter, ascending, skip) {
  const table = 'directory_listings';
  const reviewTable =
    vertical === 'businesses' ? 'business_listing_reviews' : 'professional_listing_reviews';
  const spec = mergePublicFilter(filter);
  const sb = getSupabaseAdmin();

  let idQuery = applyFilterSpec(sb.from(table).select('id'), spec);
  const { data: idRows, error: idErr } = await idQuery;
  if (idErr) throw idErr;

  const matchingIds = (idRows || []).map((row) => String(row.id));
  const matchingSet = new Set(matchingIds);
  if (!matchingIds.length) return [];

  const { data: reviews, error: revErr } = await sb.from(reviewTable).select('listing_id, rating');
  if (revErr) throw revErr;

  const ranked = rankListingIdsByReviews(reviews).filter((row) => matchingSet.has(row.id));
  ranked.sort((a, b) => {
    const diff = a.ratingAverage - b.ratingAverage;
    if (diff !== 0) return ascending ? diff : -diff;
    return b.reviewCount - a.reviewCount;
  });

  const rankedIds = new Set(ranked.map((row) => row.id));
  const unranked = matchingIds.filter((id) => !rankedIds.has(id));
  const orderedIds = [...ranked.map((row) => row.id), ...unranked];
  const pageIds = orderedIds.slice(skip, skip + limit).filter(isUuid);
  if (!pageIds.length) return [];

  const docs = await runListingQuery(
    table,
    mergePublicFilter(mergeSpecs(filter, { in: { id: pageIds } })),
    [{ column: 'id', ascending: true }],
    pageIds.length,
    0,
  );
  const byId = new Map(docs.map((doc) => [String(doc.id), doc]));
  const orderedDocs = pageIds.map((id) => byId.get(id)).filter(Boolean);
  return formatDocsForKind(vertical, orderedDocs);
}

async function queryDirectory(vertical, limit, filter = { eq: { vertical } }, sort = null, skip = 0) {
  const sortSpec = sort && sort.length ? sort : buildDirectorySort('newest');
  if (isRatingSortSpec(sortSpec)) {
    const ascending = Boolean(sortSpec.find((s) => s.column === 'rating_average')?.ascending);
    return queryDirectoryOrderedByRating(vertical, limit, filter, ascending, skip);
  }
  const docs = await runListingQuery(
    'directory_listings',
    mergePublicFilter(filter),
    sortSpec,
    limit,
    skip,
  );
  return formatDocsForKind(vertical, docs);
}

async function countDirectory(filter = {}) {
  return countListingQuery('directory_listings', mergePublicFilter(filter));
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

/**
 * Active OKAZION deals across all verticals (okazion_until in the future).
 * Optional filters: `kind` (home vertical id) and free-text `q`.
 */
async function queryOkazionListings(limit = 48, skip = 0, query = {}) {
  const take = Math.max(limit + skip, limit);
  const nowIso = new Date().toISOString();
  const okazionFilter = { gt: { okazion_until: nowIso } };
  const sortSpec = [
    { column: 'okazion_until', ascending: false, nullsFirst: false },
    { column: newestTimestampColumn(), ascending: false },
  ];

  const VERTICAL_TO_KIND = {
    'real-estate': 'real-estate',
    cars: 'car',
    jobs: 'job',
    marketplace: 'marketplace',
  };

  const SEARCH_FIELDS_BY_KIND = {
    'real-estate': ['title', 'description'],
    car: ['description', 'make', 'model', 'variant'],
    job: ['title', 'description'],
    marketplace: ['title', 'description'],
  };

  const allKinds = [
    { kind: 'real-estate', table: 'real_estate_listings', base: {} },
    { kind: 'car', table: 'car_listings', base: {} },
    { kind: 'job', table: 'job_listings', base: activeJobCreatedAtFilter() },
    { kind: 'marketplace', table: 'marketplace_listings', base: {} },
  ];

  const rawKind = String(query.kind ?? '').trim().toLowerCase();
  const selectedKind = VERTICAL_TO_KIND[rawKind] || null;
  const kinds = selectedKind ? allKinds.filter((k) => k.kind === selectedKind) : allKinds;

  const q = String(query.q ?? '').trim();

  const batches = await Promise.all(
    kinds.map(async ({ kind, table, base }) => {
      try {
        let filter = mergeSpecs(base, okazionFilter);
        if (q.length >= 2) {
          const fields = SEARCH_FIELDS_BY_KIND[kind] || ['title', 'description'];
          const or = buildIlikeOrFilter(fields, q);
          if (or) filter = mergeSpecs(filter, { or });
        }
        const docs = await runListingQuery(
          table,
          mergePublicFilter(filter),
          sortSpec,
          take,
          0,
        );
        return docs.map((d) => ({ kind, doc: d }));
      } catch (err) {
        if (/okazion_until/i.test(String(err.message || ''))) return [];
        throw err;
      }
    }),
  );

  const merged = batches
    .flat()
    .sort((a, b) => {
      const aUntil = new Date(a.doc.okazionUntil || a.doc.okazion_until || 0).getTime();
      const bUntil = new Date(b.doc.okazionUntil || b.doc.okazion_until || 0).getTime();
      if (bUntil !== aUntil) return bUntil - aUntil;
      const aBump = new Date(
        a.doc.bumpedAt || a.doc.bumped_at || a.doc.createdAt || a.doc.created_at || 0,
      ).getTime();
      const bBump = new Date(
        b.doc.bumpedAt || b.doc.bumped_at || b.doc.createdAt || b.doc.created_at || 0,
      ).getTime();
      return bBump - aBump;
    });

  const total = merged.length;
  const pageDocs = merged.slice(skip, skip + limit);
  const byKind = new Map();
  for (const row of pageDocs) {
    if (!byKind.has(row.kind)) byKind.set(row.kind, []);
    byKind.get(row.kind).push(row.doc);
  }

  const formattedById = new Map();
  await Promise.all(
    [...byKind.entries()].map(async ([kind, docs]) => {
      const formatted = await formatDocsForKind(kind, docs);
      formatted.forEach((listing, idx) => {
        const id = String(docs[idx]?.id || listing.id);
        formattedById.set(`${kind}:${id}`, listing);
      });
    }),
  );

  const listings = pageDocs
    .map(({ kind, doc }) => formattedById.get(`${kind}:${String(doc.id)}`))
    .filter(Boolean);

  return { listings, total };
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
  queryLatestVerticals,
  topViewedByKind,
  queryOkazionListings,
  attachDetailMetrics,
};
