'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');
const { isValidKind, TABLE_BY_KIND } = require('./listing-refresh');
const { refreshHoursForPlanCode } = require('./auto-refresh-packages');

function resolvePlanCode(sub) {
  if (!sub) return 'free';
  const code = String(sub.plan_code || '').trim().toLowerCase();
  if (code && code !== 'free') return code;
  const title = String(sub.contract_title || '').toLowerCase();
  if (title.includes('elite')) return 'elite';
  if (title.includes('grow')) return 'grow';
  if (title.includes('starter')) return 'starter';
  if (code) return code;
  return 'free';
}

async function getActivePaidSubscription(userId) {
  const sb = getSupabaseAdmin();
  const now = new Date();
  const { data, error } = await sb
    .from('user_subscriptions')
    .select('plan_code, contract_title, refresh_every_hours, status, expires_at, price_eur')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (
    (data || []).find(
      (s) =>
        s.status === 'active' &&
        Number(s.price_eur) > 0 &&
        (!s.expires_at || new Date(s.expires_at) >= now),
    ) || null
  );
}

async function countEnabledSlots(userId) {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from('listing_auto_refresh')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('enabled', true);
  if (error) {
    // Table may not exist yet.
    if (String(error.message || '').includes('listing_auto_refresh')) return 0;
    throw error;
  }
  return Number(count) || 0;
}

async function listEnrolled(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('listing_auto_refresh')
    .select('listing_kind, listing_id, enabled, last_refreshed_at')
    .eq('user_id', userId)
    .eq('enabled', true);
  if (error) {
    if (String(error.message || '').includes('listing_auto_refresh')) return [];
    throw error;
  }
  return (data || []).map((row) => ({
    kind: row.listing_kind,
    listingId: String(row.listing_id),
    lastRefreshedAt: row.last_refreshed_at || null,
  }));
}

async function getAutoRefreshSnapshot(userId) {
  const sb = getSupabaseAdmin();

  let slots = 0;
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('auto_refresh_slots')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) {
    if (!String(pErr.message || '').toLowerCase().includes('auto_refresh_slots')) {
      throw pErr;
    }
  } else {
    slots = Number(profile?.auto_refresh_slots) || 0;
  }

  const [used, enrolled, active] = await Promise.all([
    countEnabledSlots(userId),
    listEnrolled(userId),
    getActivePaidSubscription(userId),
  ]);

  const planCode = resolvePlanCode(active);
  const refreshEveryHours =
    active?.refresh_every_hours != null
      ? Number(active.refresh_every_hours)
      : refreshHoursForPlanCode(planCode);

  return {
    slots,
    used,
    enrolled,
    planCode,
    refreshEveryHours,
  };
}

async function setListingAutoRefresh({ userId, kind, listingId, enabled }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const table = TABLE_BY_KIND[kind];
  const sb = getSupabaseAdmin();

  let listingQ = sb.from(table).select('id, poster_id, status').eq('id', listingId);
  if (kind === 'businesses' || kind === 'professionals') {
    listingQ = listingQ.eq('vertical', kind);
  }
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të ndryshoni këtë njoftim.' };
  }
  if (enabled && String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të hyjnë në Auto-Refresh.',
    };
  }

  const snapshot = await getAutoRefreshSnapshot(userId);
  const alreadyOn = snapshot.enrolled.some(
    (e) => e.kind === kind && e.listingId === String(listingId),
  );

  if (enabled) {
    if (alreadyOn) {
      return { ok: true, enabled: true, ...snapshot };
    }
    if (snapshot.slots <= 0) {
      return {
        ok: false,
        status: 400,
        message: 'Nuk keni vende Auto-Refresh. Blini një paketë te Paketat shtesë.',
      };
    }
    if (snapshot.used >= snapshot.slots) {
      return {
        ok: false,
        status: 400,
        message: `Kapaciteti është plot (${snapshot.used}/${snapshot.slots}). Hiqni një njoftim ose blini më shumë vende.`,
      };
    }

    const now = new Date().toISOString();
    const { error: upsertErr } = await sb.from('listing_auto_refresh').upsert(
      {
        user_id: userId,
        listing_kind: kind,
        listing_id: listingId,
        enabled: true,
        updated_at: now,
      },
      { onConflict: 'user_id,listing_kind,listing_id' },
    );
    if (upsertErr) throw upsertErr;
  } else {
    const { error: delErr } = await sb
      .from('listing_auto_refresh')
      .delete()
      .eq('user_id', userId)
      .eq('listing_kind', kind)
      .eq('listing_id', listingId);
    if (delErr) throw delErr;
  }

  const next = await getAutoRefreshSnapshot(userId);
  return { ok: true, enabled: Boolean(enabled), ...next };
}

module.exports = {
  resolvePlanCode,
  getAutoRefreshSnapshot,
  setListingAutoRefresh,
  listEnrolled,
};
