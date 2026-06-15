const mongoose = require('mongoose');
const SavedListing = require('../models/SavedListing');
const { saverFromUser, metricsKey, fetchMetricsMap } = require('./listing-metrics');
const { PUBLIC_LISTING_STATUS_FILTER } = require('./listing-moderation-fields');
const { buildCityIndex } = require('./public-listings/query-helpers');
const { reviewStatsByListingIds } = require('./business-review-stats');
const { professionalReviewStatsByListingIds } = require('./professional-review-stats');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('./public-listings/formatters');

const MODEL_BY_KIND = {
  'real-estate': require('../models/RealEstateListing'),
  car: require('../models/CarListing'),
  job: require('../models/JobListing'),
  marketplace: require('../models/MarketplaceListing'),
  businesses: require('../models/DirectoryListing'),
  professionals: require('../models/DirectoryListing'),
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
  const Model = MODEL_BY_KIND[kind];
  if (!Model || !mongoose.isValidObjectId(listingId)) return null;
  const filter = { _id: listingId, ...PUBLIC_LISTING_STATUS_FILTER };
  if (kind === 'businesses' || kind === 'professionals') {
    filter.vertical = kind;
  }
  return Model.findOne(filter).lean();
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
  const docs = await SavedListing.find({
    saverId: saver.saverId,
    saverModel: saver.saverModel,
  })
    .select('listingKind listingId')
    .lean();
  return docs.map((d) => metricsKey(d.listingKind, d.listingId));
}

async function listSavedListingsForSaver(saver, { page = 1, limit = 24 } = {}) {
  if (!saver) return { keys: [], items: [], total: 0, page: 1, limit, totalPages: 1 };

  const skip = (Math.max(1, page) - 1) * limit;
  const [rows, total, keys] = await Promise.all([
    SavedListing.find({ saverId: saver.saverId, saverModel: saver.saverModel })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SavedListing.countDocuments({ saverId: saver.saverId, saverModel: saver.saverModel }),
    getSavedKeysForSaver(saver),
  ]);

  const loaded = [];
  for (const row of rows) {
    const kind = row.listingKind;
    const listingId = String(row.listingId);
    const doc = await loadApprovedListing(kind, listingId);
    if (!doc) continue;
    loaded.push({ kind, doc, savedAt: row.createdAt });
  }

  const cityById = await buildCityIndex(loaded.map((r) => r.doc));
  const bizIds = loaded.filter((r) => r.kind === 'businesses').map((r) => r.doc._id);
  const profIds = loaded.filter((r) => r.kind === 'professionals').map((r) => r.doc._id);
  const [bizStats, profStats] = await Promise.all([
    bizIds.length ? reviewStatsByListingIds(bizIds) : null,
    profIds.length ? professionalReviewStatsByListingIds(profIds) : null,
  ]);

  const refs = loaded.map((r) => ({ kind: r.kind, listingId: String(r.doc._id) }));
  const metricsMap = await fetchMetricsMap(refs, saver);

  const items = [];
  for (const row of loaded) {
    const reviewStats = row.kind === 'businesses' ? bizStats : row.kind === 'professionals' ? profStats : null;
    const formatted = await formatSavedRow(row.kind, row.doc, cityById, reviewStats);
    if (!formatted) continue;
    const m = metricsMap.get(metricsKey(row.kind, formatted.id)) ?? {};
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
        viewCount: m.viewCount ?? 0,
        clickCount: m.clickCount ?? 0,
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
