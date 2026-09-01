'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');
const { reportedSaveCount } = require('./save-count-utils');

const LISTING_KINDS = new Set(['real-estate', 'car', 'job', 'marketplace', 'businesses', 'professionals']);

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

const HOT_LEAD_HIGH_INTENT_KEYS = new Set(['saved', 'shared', 'returned', 'multiListing', 'repeatView']);

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
  return countHotLeadSignals(signals) >= 3;
}

function metricsKey(kind, listingId) {
  return `${kind}:${String(listingId)}`;
}

function emptyMetrics() {
  return { viewCount: 0, shareCount: 0, saveCount: 0 };
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
      shareCount: existing.share_count ?? 0,
      saveCount: existing.save_count,
    };
  }

  const { data: created, error: insErr } = await sb
    .from('listing_engagements')
    .insert({
      listing_kind: kind,
      listing_id: listingId,
      view_count: 0,
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
        shareCount: again?.share_count ?? 0,
        saveCount: again?.save_count,
      };
    }
    throw insErr;
  }
  return {
    viewCount: created.view_count ?? 0,
    shareCount: created.share_count ?? 0,
    saveCount: created.save_count,
  };
}

function metricsFromEngagementRow(row) {
  if (!row) return null;
  const metrics = {
    viewCount: row.view_count ?? row.viewCount ?? 0,
    shareCount: row.share_count ?? row.shareCount ?? 0,
  };
  if (Object.prototype.hasOwnProperty.call(row, 'save_count')) {
    metrics.saveCount = row.save_count ?? 0;
  }
  return metrics;
}

async function incrementEngagementFallback(kind, listingId, event) {
  const current = await ensureEngagement(kind, listingId);
  const patch = { updated_at: new Date().toISOString() };
  if (event === 'share') patch.share_count = (current.shareCount ?? 0) + 1;
  else if (event === 'view') patch.view_count = (current.viewCount ?? 0) + 1;
  else return current;

  const { data, error } = await getSupabaseAdmin()
    .from('listing_engagements')
    .update(patch)
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .select('view_count, share_count')
    .single();
  if (error) throw error;
  return (
    metricsFromEngagementRow(data) ?? {
      viewCount: patch.view_count ?? current.viewCount,
      shareCount: patch.share_count ?? current.shareCount,
    }
  );
}

async function incrementEngagement(kind, listingId, event) {
  const { data, error } = await getSupabaseAdmin().rpc('increment_listing_engagement', {
    p_listing_kind: kind,
    p_listing_id: listingId,
    p_event: event,
  });
  if (error) {
    console.warn('increment_listing_engagement RPC failed, using fallback:', error.message || error);
    return incrementEngagementFallback(kind, listingId, event);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return metricsFromEngagementRow(row) ?? ensureEngagement(kind, listingId);
}

const STATS_PERIODS = new Set(['all', '1d', '7d', '30d', '90d']);

function normalizeStatsPeriod(raw) {
  const period = String(raw || 'all').trim().toLowerCase();
  return STATS_PERIODS.has(period) ? period : 'all';
}

function statsPeriodSince(period) {
  const now = Date.now();
  if (period === '1d') return new Date(now - 24 * 60 * 60 * 1000);
  if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
  return null;
}

async function logMetricEvent(kind, listingId, eventType) {
  if (eventType !== 'view' && eventType !== 'share') return;
  try {
    const { error } = await getSupabaseAdmin().from('listing_metric_events').insert({
      listing_kind: kind,
      listing_id: listingId,
      event_type: eventType,
    });
    if (error && !/listing_metric_events/i.test(String(error.message || ''))) {
      console.warn('logMetricEvent:', error.message || error);
    }
  } catch (err) {
    console.warn('logMetricEvent:', err?.message || err);
  }
}

async function fetchListingCreatedAtMap(refs) {
  const valid = refs.filter((r) => isValidKind(r.kind) && isUuid(r.listingId));
  const idsByKind = new Map();
  for (const ref of valid) {
    if (!idsByKind.has(ref.kind)) idsByKind.set(ref.kind, []);
    idsByKind.get(ref.kind).push(ref.listingId);
  }

  const sb = getSupabaseAdmin();
  const out = new Map();

  await Promise.all(
    Array.from(idsByKind.entries()).map(async ([kind, ids]) => {
      const table = TABLE_BY_KIND[kind];
      if (!table || ids.length === 0) return;
      let q = sb.from(table).select('id, created_at').in('id', ids);
      if (kind === 'businesses' || kind === 'professionals') {
        q = q.eq('vertical', kind);
      }
      const { data, error } = await q;
      if (error) throw error;
      for (const row of data || []) {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        if (createdAt && !Number.isNaN(createdAt.getTime())) {
          out.set(metricsKey(kind, row.id), createdAt);
        }
      }
    })
  );

  return out;
}

/**
 * Per-listing metrics for a time window. Saves use saved_listings.created_at;
 * views/shares use listing_metric_events when available. Listings with no event
 * history yet fall back to listing_engagements totals only when the listing
 * was created inside the selected window (all activity must be within range).
 */
async function fetchPeriodMetricsMap(refs, period) {
  const valid = refs.filter((r) => isValidKind(r.kind) && isUuid(r.listingId));
  if (valid.length === 0) return new Map();

  const normalized = normalizeStatsPeriod(period);
  if (normalized === 'all') return fetchMetricsMap(valid);

  const since = statsPeriodSince(normalized);
  if (!since) return fetchMetricsMap(valid);

  const sb = getSupabaseAdmin();
  const orFilter = valid.map((r) => `and(listing_kind.eq."${r.kind}",listing_id.eq."${r.listingId}")`).join(',');
  const sinceIso = since.toISOString();

  const [eventsResult, savesResult, engagementResult, everEventsResult, listingCreatedAt] = await Promise.all([
    sb
      .from('listing_metric_events')
      .select('listing_kind, listing_id, event_type')
      .gte('created_at', sinceIso)
      .or(orFilter),
    sb.from('saved_listings').select('listing_kind, listing_id').gte('created_at', sinceIso).or(orFilter),
    fetchEngagementRows(sb, orFilter),
    sb.from('listing_metric_events').select('listing_kind, listing_id').or(orFilter),
    fetchListingCreatedAtMap(valid),
  ]);

  if (eventsResult.error && !/listing_metric_events/i.test(String(eventsResult.error.message || ''))) {
    throw eventsResult.error;
  }
  if (savesResult.error) throw savesResult.error;
  if (everEventsResult.error && !/listing_metric_events/i.test(String(everEventsResult.error.message || ''))) {
    throw everEventsResult.error;
  }

  const viewCounts = new Map();
  const shareCounts = new Map();
  for (const row of eventsResult.data || []) {
    const key = metricsKey(row.listing_kind, row.listing_id);
    if (row.event_type === 'share') {
      shareCounts.set(key, (shareCounts.get(key) || 0) + 1);
    } else if (row.event_type === 'view') {
      viewCounts.set(key, (viewCounts.get(key) || 0) + 1);
    }
  }

  const saveCounts = new Map();
  for (const row of savesResult.data || []) {
    const key = metricsKey(row.listing_kind, row.listing_id);
    saveCounts.set(key, (saveCounts.get(key) || 0) + 1);
  }

  const engagementByKey = new Map(
    (engagementResult.data || []).map((row) => [
      metricsKey(row.listing_kind, row.listing_id),
      {
        viewCount: row.view_count ?? 0,
        shareCount: row.share_count ?? 0,
        saveCount: row.save_count,
      },
    ])
  );

  const hasEventsEver = new Set(
    (everEventsResult.data || []).map((row) => metricsKey(row.listing_kind, row.listing_id))
  );

  const out = new Map();
  for (const ref of valid) {
    const key = metricsKey(ref.kind, ref.listingId);
    let viewCount = viewCounts.get(key) || 0;
    let shareCount = shareCounts.get(key) || 0;
    const saveCount = saveCounts.get(key) || 0;

    // Pre-event-tracking listings: only attribute cumulative totals when the
    // listing did not exist before the selected window.
    if (!hasEventsEver.has(key)) {
      const createdAt = listingCreatedAt.get(key);
      if (createdAt && createdAt >= since) {
        const engagement = engagementByKey.get(key);
        if (engagement) {
          viewCount = engagement.viewCount ?? 0;
          shareCount = engagement.shareCount ?? 0;
        }
      }
    }

    out.set(key, { viewCount, shareCount, saveCount });
  }
  return out;
}

async function countSaves(kind, listingId) {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from('saved_listings')
    .select('id', { count: 'exact', head: true })
    .eq('listing_kind', kind)
    .eq('listing_id', listingId);
  if (error) throw error;
  if (typeof count === 'number') return count;

  // HEAD Content-Range can be stripped; fall back to a real select.
  const { data, error: fetchErr } = await sb
    .from('saved_listings')
    .select('id')
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .limit(1000);
  if (fetchErr) throw fetchErr;
  return (data || []).length;
}

async function adjustStoredSaveCount(sb, kind, listingId, delta) {
  const { data, error } = await sb.rpc('increment_listing_save_count', {
    p_listing_kind: kind,
    p_listing_id: listingId,
    p_delta: delta,
  });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    return Number.isFinite(Number(row?.save_count)) ? Number(row.save_count) : 0;
  }

  // Compatibility fallback while the counter migration is being deployed.
  if (/increment_listing_save_count|save_count/i.test(String(error.message || ''))) {
    return null;
  }
  throw error;
}

async function fetchSaveCounts(sb, orFilter) {
  // Compatibility fallback for databases that have not applied the stored
  // save-count migration yet. One filtered query is much cheaper than
  // repeatedly paging through the same saved-listing relation.
  const { data, error } = await sb.from('saved_listings').select('listing_kind, listing_id').or(orFilter);
  if (error) throw error;

  const savesByKey = new Map();
  for (const row of data || []) {
    const key = metricsKey(row.listing_kind, row.listing_id);
    savesByKey.set(key, (savesByKey.get(key) || 0) + 1);
  }
  return savesByKey;
}

async function fetchEngagementRows(sb, orFilter) {
  const withSaveCount = await sb
    .from('listing_engagements')
    .select('listing_kind, listing_id, view_count, share_count, save_count')
    .or(orFilter);
  if (!withSaveCount.error) {
    return { data: withSaveCount.data || [], hasSaveCount: true };
  }

  // Keep older deployments working until the counter migration is applied.
  if (!/save_count/i.test(String(withSaveCount.error.message || ''))) {
    throw withSaveCount.error;
  }
  const legacy = await sb
    .from('listing_engagements')
    .select('listing_kind, listing_id, view_count, share_count')
    .or(orFilter);
  if (legacy.error) throw legacy.error;
  return { data: legacy.data || [], hasSaveCount: false };
}

async function getSavedSet(saver, refs) {
  if (!saver || refs.length === 0) return new Set();
  const orFilter = refs.map((r) => `and(listing_kind.eq."${r.kind}",listing_id.eq."${r.listingId}")`).join(',');
  const { data, error } = await getSupabaseAdmin()
    .from('saved_listings')
    .select('listing_kind, listing_id')
    .eq('saver_id', saver.saverId)
    .or(orFilter);
  if (error) throw error;

  return new Set((data || []).map((row) => metricsKey(row.listing_kind, row.listing_id)));
}

/**
 * @param {{ kind: string, listingId: string }[]} refs
 * @param {{ saverId: string, saverModel: string } | null} saver
 */
async function fetchMetricsMap(refs, saver = null) {
  const valid = refs.filter((r) => isValidKind(r.kind) && isUuid(r.listingId));
  if (valid.length === 0) return new Map();

  const sb = getSupabaseAdmin();
  const orFilter = valid.map((r) => `and(listing_kind.eq."${r.kind}",listing_id.eq."${r.listingId}")`).join(',');

  const [engagementResult, savedSet] = await Promise.all([
    fetchEngagementRows(sb, orFilter),
    getSavedSet(saver, valid),
  ]);
  let savesByKey = new Map();
  if (engagementResult.hasSaveCount) {
    for (const row of engagementResult.data) {
      savesByKey.set(metricsKey(row.listing_kind, row.listing_id), row.save_count ?? 0);
    }
  } else {
    savesByKey = await fetchSaveCounts(sb, orFilter);
  }

  const engagementByKey = new Map(
    engagementResult.data.map((e) => [
      metricsKey(e.listing_kind, e.listing_id),
      {
        viewCount: e.view_count ?? 0,
        shareCount: e.share_count ?? 0,
      },
    ])
  );

  const map = new Map();
  for (const r of valid) {
    const key = metricsKey(r.kind, r.listingId);
    const base = engagementByKey.get(key) ?? { viewCount: 0, shareCount: 0 };
    const payload = {
      viewCount: base.viewCount,
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

async function recordListingEvent(req, { kind, listingId, event, signals = null, includeMetrics = true }) {
  if (!isValidKind(kind) || !isUuid(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing.' };
  }
  if (!['view', 'share', 'hot_lead'].includes(event)) {
    return { ok: false, status: 400, message: 'Invalid event.' };
  }

  if (event === 'hot_lead' && !qualifiesAsHotLead(signals)) {
    return {
      ok: false,
      status: 400,
      message: 'Hot lead requires at least 3 engagement signals including 1 high-intent behavior.',
    };
  }

  const exists = await listingExists(kind, listingId);
  if (!exists) return { ok: false, status: 404, message: 'Listing not found.' };

  const visitorKey = visitorKeyFromRequest(req);
  let incremented = true;

  if (event === 'view' || event === 'hot_lead') {
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

  let engagement = null;
  if (event === 'share' || (incremented && event !== 'hot_lead')) {
    engagement = await incrementEngagement(kind, listingId, event);
    if (event === 'share' || (event === 'view' && incremented)) {
      await logMetricEvent(kind, listingId, event);
    }
  }

  // Batched views only need to record the event. Avoid rebuilding the full
  // metrics payload and checking saved_listings once per item in the batch.
  if (!includeMetrics && event === 'view') {
    return { ok: true };
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

  if (!engagement) {
    engagement = await ensureEngagement(kind, listingId);
  }
  const counted = typeof engagement.saveCount === 'number' ? engagement.saveCount : await countSaves(kind, listingId);
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
      shareCount: engagement.shareCount ?? 0,
      saveCount: reportedSaveCount(counted, saved),
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
  let storedSaveCount = null;
  if (existing) {
    const { error } = await sb.from('saved_listings').delete().eq('id', existing.id);
    if (error) throw error;
    saved = false;
    storedSaveCount = await adjustStoredSaveCount(sb, kind, listingId, -1);
  } else {
    const { error } = await sb.from('saved_listings').insert({
      saver_id: saver.saverId,
      listing_kind: kind,
      listing_id: listingId,
    });
    if (error) throw error;
    saved = true;
    storedSaveCount = await adjustStoredSaveCount(sb, kind, listingId, 1);
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

  const saveCount = reportedSaveCount(storedSaveCount ?? (await countSaves(kind, listingId)), saved);
  const engagement = await ensureEngagement(kind, listingId);
  return {
    ok: true,
    saved,
    metrics: {
      viewCount: engagement.viewCount ?? 0,
      shareCount: engagement.shareCount ?? 0,
      saveCount,
      saved,
    },
  };
}

async function enrichListingsSaverState(listings, saver) {
  if (!saver || !Array.isArray(listings) || listings.length === 0) return listings;
  const refs = listings.filter((l) => l?.id && l?.kind).map((l) => ({ kind: l.kind, listingId: l.id }));
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
  fetchPeriodMetricsMap,
  normalizeStatsPeriod,
  attachMetricsToListing,
  attachMetricsToListings,
  attachOwnerMetrics,
  enrichListingsSaverState,
  recordListingEvent,
  toggleSavedListing,
};
