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
  mergeSpecs,
  isUuid,
} = require('./query-helpers');
const { mergePublicFilter } = require('../listing-moderation');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./formatters');

const TABLE_BY_KIND = {
  'real-estate': 'real_estate_listings',
  car: 'car_listings',
  job: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
};

function baseFilterForKind(kind) {
  if (kind === 'job') return activeJobCreatedAtFilter();
  if (kind === 'businesses' || kind === 'professionals') return { eq: { vertical: kind } };
  return {};
}

async function runListingQuery(table, filterSpec, sortSpec, limit, skip = 0) {
  const sb = getSupabaseAdmin();
  let q = applyFilterSpec(sb.from(table).select('*'), filterSpec);
  q = applySort(q, sortSpec && sortSpec.length ? sortSpec : buildSort('newest'));
  if (limit > 0) q = q.range(skip, skip + limit - 1);
  const { data, error } = await q;
  if (error) throw error;
  return camelizeRows(data);
}

async function countListingQuery(table, filterSpec) {
  const sb = getSupabaseAdmin();
  let q = applyFilterSpec(sb.from(table).select('*', { count: 'exact', head: true }), filterSpec);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
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
    reviewStats = await reviewStatsByListingIds(docs.map((d) => d.id));
  } else if (kind === 'professionals') {
    reviewStats = await professionalReviewStatsByListingIds(docs.map((d) => d.id));
  }
  return attachMetricsToListings(docs.map((d) => formatDirectory(d, cityById, reviewStats)));
}

/**
 * Top listings for a vertical by view count (listing_engagements).
 * Falls back to newest approved listings when engagement data is sparse.
 */
async function topViewedByKind(kind, limit) {
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
    .limit(Math.max(limit * 3, limit));
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
  return formatDocsForKind(kind, orderedDocs);
}

async function queryRealEstate(limit, filter = {}, sort = null, skip = 0) {
  const docs = await runListingQuery(
    'real_estate_listings',
    mergePublicFilter(filter),
    sort,
    limit,
    skip,
  );
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatRealEstate(d, cityById)));
}

async function countRealEstate(filter = {}) {
  return countListingQuery('real_estate_listings', mergePublicFilter(filter));
}

async function queryCars(limit, filter = {}, sort = null, skip = 0) {
  const docs = await runListingQuery('car_listings', mergePublicFilter(filter), sort, limit, skip);
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatCar(d, cityById)));
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
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatJob(d, cityById)));
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
  const cityById = await buildCityIndex(docs);
  return attachMetricsToListings(docs.map((d) => formatMarketplace(d, cityById)));
}

async function countMarketplace(filter = {}) {
  return countListingQuery('marketplace_listings', mergePublicFilter(filter));
}

async function queryDirectory(vertical, limit, filter = { eq: { vertical } }, sort = null, skip = 0) {
  const docs = await runListingQuery(
    'directory_listings',
    mergePublicFilter(filter),
    sort,
    limit,
    skip,
  );
  const cityById = await buildCityIndex(docs);
  let reviewStats = null;
  if (vertical === 'businesses') {
    reviewStats = await reviewStatsByListingIds(docs.map((d) => d.id));
  } else if (vertical === 'professionals') {
    reviewStats = await professionalReviewStatsByListingIds(docs.map((d) => d.id));
  }
  return attachMetricsToListings(docs.map((d) => formatDirectory(d, cityById, reviewStats)));
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
