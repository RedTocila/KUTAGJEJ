const mongoose = require('mongoose');
const RealEstateListing = require('../models/RealEstateListing');
const CarListing = require('../models/CarListing');
const JobListing = require('../models/JobListing');
const MarketplaceListing = require('../models/MarketplaceListing');
const DirectoryListing = require('../models/DirectoryListing');
const AdminNotification = require('../models/AdminNotification');
const { PUBLIC_LISTING_STATUS_FILTER } = require('./listing-moderation-fields');
const { buildCityIndex } = require('./public-listings/query-helpers');

const LISTING_KINDS = {
  'real-estate': {
    model: RealEstateListing,
    label: 'Prona',
    title: (doc) => doc.title,
  },
  cars: {
    model: CarListing,
    label: 'Makina',
    title: (doc) => `${doc.make} ${doc.model}`.trim(),
  },
  jobs: {
    model: JobListing,
    label: 'Punë',
    title: (doc) => doc.title,
  },
  marketplace: {
    model: MarketplaceListing,
    label: 'Tregu',
    title: (doc) => doc.title,
  },
  businesses: {
    model: DirectoryListing,
    label: 'Biznese',
    title: (doc) => doc.title,
    extraFilter: { vertical: 'businesses' },
  },
  professionals: {
    model: DirectoryListing,
    label: 'Profesionistë',
    title: (doc) => doc.title,
    extraFilter: { vertical: 'professionals' },
  },
};

function mergePublicFilter(filter = {}) {
  return { ...PUBLIC_LISTING_STATUS_FILTER, ...filter };
}

function getKindConfig(kind) {
  const cfg = LISTING_KINDS[kind];
  if (!cfg) return null;
  return cfg;
}

function listingTitle(kind, doc) {
  const cfg = getKindConfig(kind);
  return cfg ? cfg.title(doc) : doc.title || 'Njoftim';
}

async function backfillListingStatuses() {
  for (const cfg of Object.values(LISTING_KINDS)) {
    await cfg.model.updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }, { status: '' }] },
      { $set: { status: 'approved' } },
    );
  }
}

async function notifyAdminsListingSubmitted(kind, listingId, title) {
  const label = getKindConfig(kind)?.label ?? kind;
  await createAdminNotification({
    type: 'listing_submitted',
    refKind: kind,
    refId: listingId,
    title: title || 'Njoftim i ri',
    message: `Njoftim i ri në ${label} pret miratimin.`,
  });
}

async function createAdminNotification({ type, refKind, refId, title, message }) {
  await AdminNotification.create({
    type,
    refKind: refKind || '',
    refId: refId ?? null,
    title,
    message: message || '',
  });
}

function formatAdminListing(kind, doc, cityById) {
  const city = doc.cityId ? cityById.get(String(doc.cityId)) : null;
  return {
    id: String(doc._id),
    kind,
    kindLabel: getKindConfig(kind)?.label ?? kind,
    title: listingTitle(kind, doc),
    status: doc.status || 'pending',
    posterId: String(doc.posterId),
    posterModel: doc.posterModel,
    cityName: city?.name ?? null,
    price: doc.price ?? doc.salary ?? null,
    currency: doc.currency ?? null,
    imageUrl: Array.isArray(doc.imageUrls) && doc.imageUrls.length ? doc.imageUrls[0] : null,
    adminNote: doc.adminNote || '',
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function listAdminListings({ status = 'pending', kind, page = 1, limit = 24 }) {
  const skip = (Math.max(1, page) - 1) * limit;
  const kinds = kind && getKindConfig(kind) ? [kind] : Object.keys(LISTING_KINDS);
  const items = [];

  for (const k of kinds) {
    const cfg = getKindConfig(k);
    const filter = { ...(cfg.extraFilter || {}) };
    if (status !== 'all') filter.status = status;
    const docs = await cfg.model.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    for (const doc of docs) {
      items.push({ kind: k, doc, createdAt: doc.createdAt });
    }
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const slice = items.slice(skip, skip + limit);
  const cityById = await buildCityIndex(slice.map((row) => row.doc));
  const listings = slice.map((row) => formatAdminListing(row.kind, row.doc, cityById));

  let total = 0;
  for (const k of kinds) {
    const cfg = getKindConfig(k);
    const filter = { ...(cfg.extraFilter || {}) };
    if (status !== 'all') filter.status = status;
    total += await cfg.model.countDocuments(filter);
  }

  return {
    listings,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

async function reviewListing(kind, listingId, admin, decision, adminNote = '') {
  const cfg = getKindConfig(kind);
  if (!cfg) return { ok: false, status: 400, message: 'Lloji i njoftimit nuk është i vlefshëm.' };
  if (!mongoose.isValidObjectId(listingId)) {
    return { ok: false, status: 400, message: 'ID e pavlefshme.' };
  }

  const doc = await cfg.model.findById(listingId);
  if (!doc) return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  if (doc.status !== 'pending') {
    return { ok: false, status: 409, message: 'Ky njoftim është shqyrtuar tashmë.' };
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  doc.status = status;
  doc.reviewedBy = admin._id;
  doc.reviewedAt = new Date();
  doc.adminNote = String(adminNote ?? '').trim().slice(0, 500);
  await doc.save();

  const cityById = await buildCityIndex([doc.toObject()]);
  return {
    ok: true,
    listing: formatAdminListing(kind, doc.toObject(), cityById),
  };
}

async function countListingsByStatus() {
  const out = {};
  for (const [kind, cfg] of Object.entries(LISTING_KINDS)) {
    const base = { ...(cfg.extraFilter || {}) };
    const [total, pending, approved, rejected] = await Promise.all([
      cfg.model.countDocuments(base),
      cfg.model.countDocuments({ ...base, status: 'pending' }),
      cfg.model.countDocuments({ ...base, status: 'approved' }),
      cfg.model.countDocuments({ ...base, status: 'rejected' }),
    ]);
    out[kind] = { total, pending, approved, rejected };
  }
  return out;
}

module.exports = {
  LISTING_KINDS,
  PUBLIC_LISTING_STATUS_FILTER,
  mergePublicFilter,
  backfillListingStatuses,
  notifyAdminsListingSubmitted,
  createAdminNotification,
  formatAdminListing,
  listAdminListings,
  reviewListing,
  countListingsByStatus,
  listingTitle,
};
