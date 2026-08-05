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
  prioritizeActivePremium,
  withoutPremiumSort,
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

function sortLooksPremium(sortSpec) {
  return (
    Array.isArray(sortSpec) &&
    sortSpec.some((s) => s.column === 'premium_until' || s.column === 'okazion_until')
  );
}

async function runListingQuery(table, filterSpec, sortSpec, limit, skip = 0) {
  const sb = getSupabaseAdmin();
  const effectiveSort = sortSpec && sortSpec.length ? sortSpec : buildSort('newest');

  const run = async (spec) => {
    let q = applyFilterSpec(sb.from(table).select('*'), filterSpec);
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
  if (error) throw error;
  return prioritizeActivePremium(camelizeRows(data));
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
    const fillerSort =
      kind === 'businesses' || kind === 'professionals'
        ? buildDirectorySort('newest')
        : buildSort('newest');
    const fillers = await runListingQuery(
      table,
      mergePublicFilter(baseFilter),
      fillerSort,
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
    sort && sort.length ? sort : buildDirectorySort('newest'),
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
    { column: 'created_at', ascending: false },
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
      const aCreated = new Date(a.doc.createdAt || a.doc.created_at || 0).getTime();
      const bCreated = new Date(b.doc.createdAt || b.doc.created_at || 0).getTime();
      return bCreated - aCreated;
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
  topViewedByKind,
  queryOkazionListings,
  attachDetailMetrics,
};
