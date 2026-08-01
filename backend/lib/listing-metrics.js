'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const LISTING_KINDS = new Set([
  'real-estate',
  'car',
  'job',
  'marketplace',
  'businesses',
  'professionals',
]);

const TABLE_BY_KIND = {
  'real-estate': 'real_estate_listings',
  car: 'car_listings',
  job: 'job_listings',
  marketplace: 'marketplace_listings',
  businesses: 'directory_listings',
  professionals: 'directory_listings',
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
      return `user:${model}:${req.user.id}`;
    }
  }
  return null;
}

function saverFromUser(user) {
  if (!user) return null;
  const model = user.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') return null;
  return { saverId: user.id, saverModel: model };
}

async function listingExists(kind, listingId) {
  const table = TABLE_BY_KIND[kind];
  if (!table || !isUuid(listingId)) return false;
  let q = getSupabaseAdmin().from(table).select('id').eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    q = q.eq('vertical', kind);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function ensureEngagement(kind, listingId) {
  const sb = getSupabaseAdmin();
  const { data: existing, error: selErr } = await sb
    .from('listing_engagements')
    .select('*')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    return {
      viewCount: existing.view_count ?? 0,
      clickCount: existing.click_count ?? 0,
      shareCount: existing.share_count ?? 0,
    };
  }

  const { data: created, error: insErr } = await sb
    .from('listing_engagements')
    .insert({
      listing_kind: kind,
      listing_id: listingId,
      view_count: 0,
      click_count: 0,
      share_count: 0,
    })
    .select('*')
    .single();
  if (insErr) {
    // Race: another request inserted first.
    if (insErr.code === '23505') {
      const { data: again, error } = await sb
        .from('listing_engagements')
        .select('*')
        .eq('listing_kind', kind)
        .eq('listing_id', listingId)
        .maybeSingle();
      if (error) throw error;
      return {
        viewCount: again?.view_count ?? 0,
        clickCount: again?.click_count ?? 0,
        shareCount: again?.share_count ?? 0,
      };
    }
    throw insErr;
  }
  return {
    viewCount: created.view_count ?? 0,
    clickCount: created.click_count ?? 0,
    shareCount: created.share_count ?? 0,
  };
}

async function incrementEngagement(kind, listingId, event) {
  await ensureEngagement(kind, listingId);
  const sb = getSupabaseAdmin();
  const { data: row, error: selErr } = await sb
    .from('listing_engagements')
    .select('*')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .single();
  if (selErr) throw selErr;

  const patch = { updated_at: new Date().toISOString() };
  if (event === 'view') patch.view_count = (row.view_count ?? 0) + 1;
  else if (event === 'click') patch.click_count = (row.click_count ?? 0) + 1;
  else if (event === 'share') patch.share_count = (row.share_count ?? 0) + 1;

  const { error: updErr } = await sb
    .from('listing_engagements')
    .update(patch)
    .eq('listing_kind', kind)
    .eq('listing_id', listingId);
  if (updErr) throw updErr;
}

async function countSaves(kind, listingId) {
  const { count, error } = await getSupabaseAdmin()
    .from('saved_listings')
    .select('*', { count: 'exact', head: true })
    .eq('listing_kind', kind)
    .eq('listing_id', listingId);
  if (error) throw error;
  return count ?? 0;
}

async function getSavedSet(saver, refs) {
  if (!saver || refs.length === 0) return new Set();
  const { data, error } = await getSupabaseAdmin()
    .from('saved_listings')
    .select('listing_kind, listing_id')
    .eq('saver_id', saver.saverId);
  if (error) throw error;

  const wanted = new Set(refs.map((r) => metricsKey(r.kind, r.listingId)));
  const out = new Set();
  for (const row of data || []) {
    const key = metricsKey(row.listing_kind, row.listing_id);
    if (wanted.has(key)) out.add(key);
  }
  return out;
}

/**
 * @param {{ kind: string, listingId: string }[]} refs
 * @param {{ saverId: string, saverModel: string } | null} saver
 */
async function fetchMetricsMap(refs, saver = null) {
  const valid = refs.filter((r) => isValidKind(r.kind) && isUuid(r.listingId));
  if (valid.length === 0) return new Map();

  const sb = getSupabaseAdmin();
  const orFilter = valid
    .map((r) => `and(listing_kind.eq."${r.kind}",listing_id.eq."${r.listingId}")`)
    .join(',');

  const [engagementRes, savesRes, savedSet] = await Promise.all([
    sb.from('listing_engagements').select('*').or(orFilter),
    sb.from('saved_listings').select('listing_kind, listing_id').or(orFilter),
    getSavedSet(saver, valid),
  ]);
  if (engagementRes.error) throw engagementRes.error;
  if (savesRes.error) throw savesRes.error;

  const engagementByKey = new Map(
    (engagementRes.data || []).map((e) => [
      metricsKey(e.listing_kind, e.listing_id),
      {
        viewCount: e.view_count ?? 0,
        clickCount: e.click_count ?? 0,
        shareCount: e.share_count ?? 0,
      },
    ]),
  );

  const savesByKey = new Map();
  for (const row of savesRes.data || []) {
    const key = metricsKey(row.listing_kind, row.listing_id);
    savesByKey.set(key, (savesByKey.get(key) || 0) + 1);
  }

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
  if (!isValidKind(kind) || !isUuid(listingId)) {
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
    const expiresAt = new Date(Date.now() + DEDUP_MS[event]).toISOString();
    const { error } = await getSupabaseAdmin().from('listing_metric_dedups').insert({
      listing_kind: kind,
      listing_id: listingId,
      visitor_key: visitorKey,
      event_type: event,
      expires_at: expiresAt,
    });
    if (error) {
      if (error.code === '23505') incremented = false;
      else throw error;
    }
  }

  if (event === 'share' || incremented) {
    await incrementEngagement(kind, listingId, event);
  }

  const saveCount = await countSaves(kind, listingId);
  const engagement = await ensureEngagement(kind, listingId);
  const saver = saverFromUser(req.user);
  let saved = false;
  if (saver) {
    const { data: hit, error } = await getSupabaseAdmin()
      .from('saved_listings')
      .select('id')
      .eq('saver_id', saver.saverId)
      .eq('listing_kind', kind)
      .eq('listing_id', listingId)
      .maybeSingle();
    if (error) throw error;
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
  if (!isValidKind(kind) || !isUuid(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing.' };
  }
  const exists = await listingExists(kind, listingId);
  if (!exists) return { ok: false, status: 404, message: 'Listing not found.' };

  const sb = getSupabaseAdmin();
  const { data: existing, error: selErr } = await sb
    .from('saved_listings')
    .select('id')
    .eq('saver_id', saver.saverId)
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (selErr) throw selErr;

  let saved;
  if (existing) {
    const { error } = await sb.from('saved_listings').delete().eq('id', existing.id);
    if (error) throw error;
    saved = false;
  } else {
    const { error } = await sb.from('saved_listings').insert({
      saver_id: saver.saverId,
      listing_kind: kind,
      listing_id: listingId,
    });
    if (error) throw error;
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
  metricsKey,
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
