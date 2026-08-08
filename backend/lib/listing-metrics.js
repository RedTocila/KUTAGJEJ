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
  hot_lead: 48 * 60 * 60 * 1000,
};

const HOT_LEAD_SIGNAL_KEYS = [
  'dwell',
  'photos',
  'scroll',
  'details',
  'saved',
  'shared',
  'returned',
  'multiListing',
  'repeatView',
];

const HOT_LEAD_HIGH_INTENT_KEYS = new Set([
  'saved',
  'shared',
  'returned',
  'multiListing',
  'repeatView',
]);

function countHotLeadSignals(signals) {
  if (!signals || typeof signals !== 'object') return 0;
  let n = 0;
  for (const key of HOT_LEAD_SIGNAL_KEYS) {
    // returned + repeatView are the same 2+ visit behavior — count once.
    if (key === 'repeatView') continue;
    if (key === 'returned') {
      if (signals.returned === true || signals.repeatView === true) n += 1;
      continue;
    }
    if (signals[key] === true) n += 1;
  }
  return n;
}

function countHotLeadHighIntentSignals(signals) {
  if (!signals || typeof signals !== 'object') return 0;
  let n = 0;
  for (const key of HOT_LEAD_HIGH_INTENT_KEYS) {
    if (key === 'repeatView') continue;
    if (key === 'returned') {
      if (signals.returned === true || signals.repeatView === true) n += 1;
      continue;
    }
    if (signals[key] === true) n += 1;
  }
  return n;
}

function qualifiesAsHotLead(signals) {
  return countHotLeadSignals(signals) >= 3 && countHotLeadHighIntentSignals(signals) >= 1;
}

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
  const { error } = await getSupabaseAdmin().rpc('increment_listing_engagement', {
    p_listing_kind: kind,
    p_listing_id: listingId,
    p_event: event,
  });
  if (error) throw error;
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

async function recordListingEvent(req, { kind, listingId, event, signals = null }) {
  if (!isValidKind(kind) || !isUuid(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing.' };
  }
  if (!['view', 'click', 'share', 'hot_lead'].includes(event)) {
    return { ok: false, status: 400, message: 'Invalid event.' };
  }

  if (event === 'hot_lead' && !qualifiesAsHotLead(signals)) {
    return {
      ok: false,
      status: 400,
      message:
        'Hot lead requires at least 3 engagement signals including 1 high-intent behavior.',
    };
  }

  const exists = await listingExists(kind, listingId);
  if (!exists) return { ok: false, status: 404, message: 'Listing not found.' };

  const visitorKey = visitorKeyFromRequest(req);
  let incremented = true;

  if (event === 'view' || event === 'click' || event === 'hot_lead') {
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

  if (event === 'share' || (incremented && event !== 'hot_lead')) {
    await incrementEngagement(kind, listingId, event);
  }

  if (event === 'share') {
    const sharer = saverFromUser(req.user);
    if (sharer) {
      try {
        const { notifyListingShared } = require('./user-notifications');
        await notifyListingShared({
          metricsKind: kind,
          listingId,
          sharerId: sharer.saverId,
        });
      } catch (err) {
        console.warn('notifyListingShared:', err?.message || err);
      }
    }
  }

  if (event === 'hot_lead' && incremented) {
    const viewer = saverFromUser(req.user);
    try {
      const { notifyListingHotLead } = require('./user-notifications');
      await notifyListingHotLead({
        metricsKind: kind,
        listingId,
        viewerId: viewer?.saverId || null,
      });
    } catch (err) {
      console.warn('notifyListingHotLead:', err?.message || err);
    }
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
    try {
      const { notifyListingSaved } = require('./user-notifications');
      await notifyListingSaved({
        metricsKind: kind,
        listingId,
        saverId: saver.saverId,
      });
    } catch (notifyErr) {
      console.warn('notifyListingSaved:', notifyErr?.message || notifyErr);
    }
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
  TABLE_BY_KIND,
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
