'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { camelizeRow } = require('./profiles');
const { isUuid, buildCityIndex } = require('./public-listings/query-helpers');
const { reviewStatsByListingIds } = require('./business-review-stats');
const { professionalReviewStatsByListingIds } = require('./professional-review-stats');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./public-listings/formatters');

/** Keep local — avoid circular require with listing-metrics (metricsKey was previously unexported). */
function metricsKey(kind, listingId) {
  return `${kind}:${String(listingId)}`;
}

function fetchMetricsMap(refs, saver) {
  return require('./listing-metrics').fetchMetricsMap(refs, saver);
}

const TABLE_BY_KIND = {
  'real-estate': 'real_estate_listings',
  car: 'car_listings',
  job: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
};

const KIND_LABELS = {
  'real-estate': 'Prona',
  car: 'Makina',
  job: 'Punë',
  marketplace: 'Tregu',
  businesses: 'Biznese',
  professionals: 'Profesionistë',
};

async function loadApprovedListing(kind, listingId) {
  const table = TABLE_BY_KIND[kind];
  if (!table || !isUuid(listingId)) return null;
  let q = getSupabaseAdmin().from(table).select('*').eq('id', listingId).eq('status', 'approved');
  if (kind === 'businesses' || kind === 'professionals') {
    q = q.eq('vertical', kind);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data ? camelizeRow(data) : null;
}

function listingCardTitle(kind, formatted) {
  if (kind === 'car') {
    return [formatted.make, formatted.model, formatted.variant].filter(Boolean).join(' ').trim();
  }
  return formatted.title || 'Njoftim';
}

function listingSubtitle(kind, formatted) {
  if (kind === 'real-estate') {
    const loc = [formatted.zoneName, formatted.cityName].filter(Boolean).join(', ');
    const price = formatted.price != null ? `${formatted.price} ${formatted.currency}` : '';
    return [loc, price].filter(Boolean).join(' · ') || null;
  }
  if (kind === 'car') {
    return [formatted.year, formatted.cityName, formatted.price != null ? `${formatted.price} ${formatted.currency}` : null]
      .filter(Boolean)
      .join(' · ') || null;
  }
  if (kind === 'job') {
    return [formatted.cityName, formatted.jobType].filter(Boolean).join(' · ') || null;
  }
  if (formatted.cityName) return formatted.cityName;
  return null;
}

async function formatSavedRow(kind, doc, cityById, reviewStats) {
  if (kind === 'real-estate') return formatRealEstate(doc, cityById);
  if (kind === 'car') return formatCar(doc, cityById);
  if (kind === 'job') return formatJob(doc, cityById);
  if (kind === 'marketplace') return formatMarketplace(doc, cityById);
  if (kind === 'businesses' || kind === 'professionals') {
    return formatDirectory(doc, cityById, reviewStats);
  }
  return null;
}

async function getSavedKeysForSaver(saver) {
  if (!saver) return [];
  const { data, error } = await getSupabaseAdmin()
    .from('saved_listings')
    .select('listing_kind, listing_id')
    .eq('saver_id', saver.saverId);
  if (error) throw error;
  return (data || []).map((d) => metricsKey(d.listing_kind, d.listing_id));
}

async function listSavedListingsForSaver(saver, { page = 1, limit = 24 } = {}) {
  if (!saver) return { keys: [], items: [], total: 0, page: 1, limit, totalPages: 1 };

  const skip = (Math.max(1, page) - 1) * limit;
  const sb = getSupabaseAdmin();

  const [rowsRes, countRes, keys] = await Promise.all([
    sb
      .from('saved_listings')
      .select('*')
      .eq('saver_id', saver.saverId)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1),
    sb
      .from('saved_listings')
      .select('*', { count: 'exact', head: true })
      .eq('saver_id', saver.saverId),
    getSavedKeysForSaver(saver),
  ]);
  if (rowsRes.error) throw rowsRes.error;
  if (countRes.error) throw countRes.error;

  const total = countRes.count ?? 0;
  const loaded = [];
  for (const row of rowsRes.data || []) {
    const kind = row.listing_kind;
    const listingId = String(row.listing_id);
    const doc = await loadApprovedListing(kind, listingId);
    if (!doc) continue;
    loaded.push({ kind, doc, savedAt: row.created_at });
  }

  const cityById = await buildCityIndex(loaded.map((r) => r.doc));
  const bizIds = loaded.filter((r) => r.kind === 'businesses').map((r) => r.doc.id);
  const profIds = loaded.filter((r) => r.kind === 'professionals').map((r) => r.doc.id);
  const [bizStats, profStats] = await Promise.all([
    bizIds.length ? reviewStatsByListingIds(bizIds) : null,
    profIds.length ? professionalReviewStatsByListingIds(profIds) : null,
  ]);

  const refs = loaded.map((r) => ({ kind: r.kind, listingId: String(r.doc.id) }));
  const { loadVerifiedPosterIdSet, loadTrustBadgePosterIdSet } = require('./public-listings/load-poster-brief');
  const posterIds = loaded.map((r) => r.doc.posterId);
  const [metricsMap, verifiedIds, trustIds] = await Promise.all([
    fetchMetricsMap(refs, saver),
    loadVerifiedPosterIdSet(posterIds),
    loadTrustBadgePosterIdSet(posterIds),
  ]);

  const items = [];
  for (const row of loaded) {
    const reviewStats = row.kind === 'businesses' ? bizStats : row.kind === 'professionals' ? profStats : null;
    const formatted = await formatSavedRow(row.kind, row.doc, cityById, reviewStats);
    if (!formatted) continue;
    const m = metricsMap.get(metricsKey(row.kind, formatted.id)) ?? {};
    const posterId = row.doc.posterId ? String(row.doc.posterId) : '';
    items.push({
      kind: row.kind,
      kindLabel: KIND_LABELS[row.kind] ?? row.kind,
      listingId: formatted.id,
      savedAt: row.savedAt,
      title: listingCardTitle(row.kind, formatted),
      subtitle: listingSubtitle(row.kind, formatted),
      imageUrl: formatted.imageUrl ?? null,
      permalinkPath: formatted.permalinkPath ?? null,
      listing: {
        ...formatted,
        sellerVerified: Boolean(posterId && verifiedIds.has(posterId)),
        sellerTrustBadge: Boolean(posterId && trustIds.has(posterId)),
        viewCount: m.viewCount ?? 0,
        shareCount: m.shareCount ?? 0,
        saveCount: m.saveCount ?? 0,
        saved: true,
      },
    });
  }

  return {
    keys,
    items,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

module.exports = {
  getSavedKeysForSaver,
  listSavedListingsForSaver,
  KIND_LABELS,
};
