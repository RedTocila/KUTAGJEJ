const mongoose = require('mongoose');
const ListingEngagement = require('../models/ListingEngagement');
const SavedListing = require('../models/SavedListing');
const ListingMetricDedup = require('../models/ListingMetricDedup');
const RealEstateListing = require('../models/RealEstateListing');
const CarListing = require('../models/CarListing');
const JobListing = require('../models/JobListing');
const MarketplaceListing = require('../models/MarketplaceListing');
const DirectoryListing = require('../models/DirectoryListing');

const LISTING_KINDS = new Set([
  'real-estate',
  'car',
  'job',
  'marketplace',
  'businesses',
  'professionals',
]);

const MODEL_BY_KIND = {
  'real-estate': RealEstateListing,
  car: CarListing,
  job: JobListing,
  marketplace: MarketplaceListing,
  businesses: DirectoryListing,
  professionals: DirectoryListing,
};

const DEDUP_MS = {
  view: 30 * 60 * 1000,
  click: 10 * 60 * 1000,
};

function metricsKey(kind, listingId) {
  return `${kind}:${String(listingId)}`;
}

function emptyMetrics() {
  return { viewCount: 0, clickCount: 0, shareCount: 0, saveCount: 0 };
}

function isValidKind(kind) {
  return LISTING_KINDS.has(kind);
}

function visitorKeyFromRequest(req) {
  const header = String(req.headers['x-visitor-id'] || '').trim();
  if (header.length >= 8 && header.length <= 128) return `anon:${header}`;
  if (req.user) {
    const model = req.user.constructor?.modelName;
    if (model === 'IndividualUser' || model === 'BusinessUser') {
      return `user:${model}:${req.user._id}`;
    }
  }
  return null;
}

function saverFromUser(user) {
  if (!user) return null;
  const model = user.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') return null;
  return { saverId: user._id, saverModel: model };
}

async function listingExists(kind, listingId) {
  const Model = MODEL_BY_KIND[kind];
  if (!Model || !mongoose.isValidObjectId(listingId)) return false;
  if (kind === 'businesses' || kind === 'professionals') {
    const vertical = kind === 'businesses' ? 'businesses' : 'professionals';
    const doc = await Model.findOne({ _id: listingId, vertical }).select('_id').lean();
    return Boolean(doc);
  }
  const doc = await Model.findById(listingId).select('_id').lean();
  return Boolean(doc);
}

async function ensureEngagement(kind, listingId) {
  return ListingEngagement.findOneAndUpdate(
    { listingKind: kind, listingId },
    { $setOnInsert: { viewCount: 0, clickCount: 0, shareCount: 0 } },
    { upsert: true, new: true },
  ).lean();
}

async function countSaves(kind, listingId) {
  return SavedListing.countDocuments({ listingKind: kind, listingId });
}

async function getSavedSet(saver, refs) {
  if (!saver || refs.length === 0) return new Set();
  const or = refs.map((r) => ({
    listingKind: r.kind,
    listingId: new mongoose.Types.ObjectId(r.listingId),
  }));
  const docs = await SavedListing.find({
    saverId: saver.saverId,
    saverModel: saver.saverModel,
    $or: or,
  })
    .select('listingKind listingId')
    .lean();
  return new Set(docs.map((d) => metricsKey(d.listingKind, d.listingId)));
}

/**
 * @param {{ kind: string, listingId: string }[]} refs
 * @param {{ saverId: import('mongoose').Types.ObjectId, saverModel: string } | null} saver
 */
async function fetchMetricsMap(refs, saver = null) {
  const valid = refs.filter((r) => isValidKind(r.kind) && mongoose.isValidObjectId(r.listingId));
  if (valid.length === 0) return new Map();

  const listingIds = valid.map((r) => new mongoose.Types.ObjectId(r.listingId));
  const kinds = [...new Set(valid.map((r) => r.kind))];

  const [engagements, saveAgg, savedSet] = await Promise.all([
    ListingEngagement.find({
      $or: valid.map((r) => ({
        listingKind: r.kind,
        listingId: new mongoose.Types.ObjectId(r.listingId),
      })),
    }).lean(),
    SavedListing.aggregate([
      {
        $match: {
          $or: valid.map((r) => ({
            listingKind: r.kind,
            listingId: new mongoose.Types.ObjectId(r.listingId),
          })),
        },
      },
      { $group: { _id: { kind: '$listingKind', id: '$listingId' }, saveCount: { $sum: 1 } } },
    ]),
    getSavedSet(saver, valid),
  ]);

  const engagementByKey = new Map(
    engagements.map((e) => [
      metricsKey(e.listingKind, e.listingId),
      {
        viewCount: e.viewCount ?? 0,
        clickCount: e.clickCount ?? 0,
        shareCount: e.shareCount ?? 0,
      },
    ]),
  );

  const savesByKey = new Map(
    saveAgg.map((row) => [
      metricsKey(row._id.kind, row._id.id),
      row.saveCount,
    ]),
  );

  const map = new Map();
  for (const r of valid) {
    const key = metricsKey(r.kind, r.listingId);
    const base = engagementByKey.get(key) ?? { viewCount: 0, clickCount: 0, shareCount: 0 };
    const payload = {
      viewCount: base.viewCount,
      clickCount: base.clickCount,
      shareCount: base.shareCount,
      saveCount: savesByKey.get(key) ?? 0,
    };
    if (saver) payload.saved = savedSet.has(key);
    map.set(key, payload);
  }
  return map;
}

function attachMetricsToListing(listing, metricsMap, saver = null) {
  if (!listing?.id || !listing?.kind) return listing;
  const m = metricsMap.get(metricsKey(listing.kind, listing.id)) ?? emptyMetrics();
  const out = {
    ...listing,
    viewCount: m.viewCount,
    clickCount: m.clickCount,
    shareCount: m.shareCount,
    saveCount: m.saveCount,
  };
  if (saver && typeof m.saved === 'boolean') out.saved = m.saved;
  return out;
}

async function attachMetricsToListings(listings, saver = null) {
  if (!Array.isArray(listings) || listings.length === 0) return listings;
  const refs = listings.map((l) => ({ kind: l.kind, listingId: l.id }));
  const map = await fetchMetricsMap(refs, saver);
  return listings.map((l) => attachMetricsToListing(l, map, saver));
}

/** Dashboard “my listings” rows without a kind field on the DTO. */
async function attachOwnerMetrics(listings, kind) {
  if (!Array.isArray(listings) || listings.length === 0) return listings;
  const withKind = listings.map((l) => ({ ...l, kind }));
  const enriched = await attachMetricsToListings(withKind);
  return enriched.map(({ kind: _k, ...rest }) => rest);
}

async function recordListingEvent(req, { kind, listingId, event }) {
  if (!isValidKind(kind) || !mongoose.isValidObjectId(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing.' };
  }
  if (!['view', 'click', 'share'].includes(event)) {
    return { ok: false, status: 400, message: 'Invalid event.' };
  }

  const exists = await listingExists(kind, listingId);
  if (!exists) return { ok: false, status: 404, message: 'Listing not found.' };

  const visitorKey = visitorKeyFromRequest(req);
  let incremented = true;

  if (event === 'view' || event === 'click') {
    if (!visitorKey) {
      return { ok: false, status: 400, message: 'Visitor id required.' };
    }
    const expiresAt = new Date(Date.now() + DEDUP_MS[event]);
    try {
      await ListingMetricDedup.create({
        listingKind: kind,
        listingId,
        visitorKey,
        eventType: event,
        expiresAt,
      });
    } catch (err) {
      if (err?.code === 11000) incremented = false;
      else throw err;
    }
  }

  if (event === 'share' || incremented) {
    const inc =
      event === 'view'
        ? { viewCount: 1 }
        : event === 'click'
          ? { clickCount: 1 }
          : { shareCount: 1 };
    await ListingEngagement.findOneAndUpdate(
      { listingKind: kind, listingId },
      { $inc: inc, $setOnInsert: { viewCount: 0, clickCount: 0, shareCount: 0 } },
      { upsert: true },
    );
  }

  const saveCount = await countSaves(kind, listingId);
  const engagement = await ensureEngagement(kind, listingId);
  const saver = saverFromUser(req.user);
  let saved = false;
  if (saver) {
    const hit = await SavedListing.findOne({
      saverId: saver.saverId,
      saverModel: saver.saverModel,
      listingKind: kind,
      listingId,
    }).lean();
    saved = Boolean(hit);
  }

  return {
    ok: true,
    metrics: {
      viewCount: engagement.viewCount ?? 0,
      clickCount: engagement.clickCount ?? 0,
      shareCount: engagement.shareCount ?? 0,
      saveCount,
      saved,
    },
  };
}

async function toggleSavedListing(req, { kind, listingId }) {
  const saver = saverFromUser(req.user);
  if (!saver) return { ok: false, status: 401, message: 'Auth required' };
  if (!isValidKind(kind) || !mongoose.isValidObjectId(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing.' };
  }
  const exists = await listingExists(kind, listingId);
  if (!exists) return { ok: false, status: 404, message: 'Listing not found.' };

  const existing = await SavedListing.findOne({
    saverId: saver.saverId,
    saverModel: saver.saverModel,
    listingKind: kind,
    listingId,
  });

  let saved;
  if (existing) {
    await existing.deleteOne();
    saved = false;
  } else {
    await SavedListing.create({
      saverId: saver.saverId,
      saverModel: saver.saverModel,
      listingKind: kind,
      listingId,
    });
    saved = true;
  }

  const saveCount = await countSaves(kind, listingId);
  const engagement = await ensureEngagement(kind, listingId);
  return {
    ok: true,
    saved,
    metrics: {
      viewCount: engagement.viewCount ?? 0,
      clickCount: engagement.clickCount ?? 0,
      shareCount: engagement.shareCount ?? 0,
      saveCount,
      saved,
    },
  };
}

async function enrichListingsSaverState(listings, saver) {
  if (!saver || !Array.isArray(listings) || listings.length === 0) return listings;
  const refs = listings
    .filter((l) => l?.id && l?.kind)
    .map((l) => ({ kind: l.kind, listingId: l.id }));
  const map = await fetchMetricsMap(refs, saver);
  return listings.map((l) => attachMetricsToListing(l, map, saver));
}

module.exports = {
  LISTING_KINDS,
  isValidKind,
  emptyMetrics,
  visitorKeyFromRequest,
  saverFromUser,
  fetchMetricsMap,
  attachMetricsToListing,
  attachMetricsToListings,
  attachOwnerMetrics,
  enrichListingsSaverState,
  recordListingEvent,
  toggleSavedListing,
};
