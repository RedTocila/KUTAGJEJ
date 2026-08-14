'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');
const {
  isValidKind,
  TABLE_BY_KIND,
  refreshListingWithBoost,
  getRefreshWindowHours,
} = require('./listing-refresh');
const { refreshHoursForPlanCode } = require('./auto-refresh-packages');

const AUTO_REFRESH_BATCH_LIMIT = 200;

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

async function listCooldownAnchors(userId) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('listing_auto_refresh')
    .select('listing_kind, listing_id, last_refreshed_at')
    .eq('user_id', userId)
    .not('last_refreshed_at', 'is', null);
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

  const [used, enrolled, cooldowns, active] = await Promise.all([
    countEnabledSlots(userId),
    listEnrolled(userId),
    listCooldownAnchors(userId),
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
    cooldowns,
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
    // Keep last_refreshed_at cooldown anchor; only clear enrollment.
    const now = new Date().toISOString();
    const { data: existing, error: existingErr } = await sb
      .from('listing_auto_refresh')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_kind', kind)
      .eq('listing_id', listingId)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) {
      const { error: offErr } = await sb
        .from('listing_auto_refresh')
        .update({ enabled: false, updated_at: now })
        .eq('user_id', userId)
        .eq('listing_kind', kind)
        .eq('listing_id', listingId);
      if (offErr) throw offErr;
    }
  }

  const next = await getAutoRefreshSnapshot(userId);
  return { ok: true, enabled: Boolean(enabled), ...next };
}

async function purchaseAutoRefreshWithBoostCoins({ userId, packageId }) {
  const { getAutoRefreshPackage } = require('./auto-refresh-packages');
  const pkg = getAutoRefreshPackage(packageId);
  if (!pkg) {
    return { ok: false, status: 400, message: 'Paketa Auto-Refresh nuk është e vlefshme.' };
  }
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }

  const cost = Math.max(0, Math.floor(Number(pkg.priceBc) || 0));
  if (cost <= 0) {
    return { ok: false, status: 400, message: 'Paketa nuk mund të blihet me Boost Coins.' };
  }

  const sb = getSupabaseAdmin();
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, boost_credits, auto_refresh_slots')
    .eq('id', userId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) {
    return { ok: false, status: 401, message: 'Profili nuk u gjet.' };
  }

  const balance = Number(profile.boost_credits) || 0;
  if (balance < cost) {
    return {
      ok: false,
      status: 400,
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
    };
  }

  const slots = Math.max(0, Math.floor(Number(pkg.slots) || 0));
  if (slots <= 0) {
    return { ok: false, status: 400, message: 'Paketa Auto-Refresh nuk është e vlefshme.' };
  }

  const now = new Date().toISOString();
  const { data: spent, error: spendErr } = await sb
    .from('profiles')
    .update({
      boost_credits: balance - cost,
      auto_refresh_slots: (Number(profile.auto_refresh_slots) || 0) + slots,
      updated_at: now,
    })
    .eq('id', userId)
    .gte('boost_credits', cost)
    .select('boost_credits, auto_refresh_slots')
    .maybeSingle();
  if (spendErr) throw spendErr;
  if (!spent) {
    return {
      ok: false,
      status: 400,
      message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${cost} BC.`,
    };
  }

  return {
    ok: true,
    slots,
    autoRefreshSlots: Number(spent.auto_refresh_slots) || 0,
    boostCredits: Number(spent.boost_credits) || 0,
    cost,
  };
}

/**
 * Process enrolled Auto-Refresh listings that are due.
 * Each successful bump uses the same path as manual refresh (tiered BC + bumped_at bump).
 */
async function processDueAutoRefreshes({
  limit = AUTO_REFRESH_BATCH_LIMIT,
  userId: onlyUserId = null,
} = {}) {
  const sb = getSupabaseAdmin();
  const batchLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || AUTO_REFRESH_BATCH_LIMIT)));
  const scopedUserId =
    onlyUserId && isUuid(String(onlyUserId)) ? String(onlyUserId) : null;

  let dueQuery = sb
    .from('listing_auto_refresh')
    .select('user_id, listing_kind, listing_id, last_refreshed_at')
    .eq('enabled', true)
    .order('last_refreshed_at', { ascending: true, nullsFirst: true })
    .limit(batchLimit);
  if (scopedUserId) {
    dueQuery = dueQuery.eq('user_id', scopedUserId);
  }

  const { data: rows, error } = await dueQuery;

  if (error) {
    if (String(error.message || '').includes('listing_auto_refresh')) {
      return { ok: true, scanned: 0, refreshed: 0, skipped: 0, failed: 0 };
    }
    throw error;
  }

  const hoursByUser = new Map();
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (const row of rows || []) {
    const userId = String(row.user_id || '');
    const kind = String(row.listing_kind || '');
    const listingId = String(row.listing_id || '');
    if (!userId || !isValidKind(kind) || !listingId) {
      skipped += 1;
      continue;
    }

    let hours = hoursByUser.get(userId);
    if (hours == null) {
      try {
        hours = await getRefreshWindowHours(sb, userId);
      } catch (err) {
        failed += 1;
        failures.push({
          userId,
          kind,
          listingId,
          message: err?.message || 'Failed to resolve refresh window',
        });
        continue;
      }
      hoursByUser.set(userId, hours);
    }

    const lastMs = row.last_refreshed_at ? new Date(row.last_refreshed_at).getTime() : NaN;
    if (Number.isFinite(lastMs) && hours > 0) {
      const requiredMs = hours * 60 * 60 * 1000;
      if (Date.now() - lastMs < requiredMs) {
        skipped += 1;
        continue;
      }
    }

    try {
      const result = await refreshListingWithBoost({
        userId,
        kind,
        listingId,
      });
      if (result.ok) {
        refreshed += 1;
      } else {
        // Cooldown / missing BC / unapproved — keep enrollment and retry later.
        skipped += 1;
        if (result.status && result.status >= 500) {
          failed += 1;
          failures.push({ userId, kind, listingId, message: result.message });
        }
      }
    } catch (err) {
      failed += 1;
      failures.push({
        userId,
        kind,
        listingId,
        message: err?.message || 'Auto-refresh failed',
      });
    }
  }

  return {
    ok: true,
    scanned: (rows || []).length,
    refreshed,
    skipped,
    failed,
    failures: failures.slice(0, 20),
  };
}

module.exports = {
  resolvePlanCode,
  getAutoRefreshSnapshot,
  setListingAutoRefresh,
  listEnrolled,
  listCooldownAnchors,
  purchaseAutoRefreshWithBoostCoins,
  processDueAutoRefreshes,
};
