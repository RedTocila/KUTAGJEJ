'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');
const { posterHasTrustBadge } = require('./public-listings/load-poster-brief');
const { isValidKind, TABLE_BY_KIND } = require('./listing-metrics');

function displayNameFromProfile(row) {
  if (!row) return null;
  if (row.account_type === 'business') {
    return (
      (row.business_name && String(row.business_name).trim()) ||
      (row.business_owner && String(row.business_owner).trim()) ||
      `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
      null
    );
  }
  return `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() || null;
}

async function assertOwnedListing(userId, kind, listingId) {
  const table = TABLE_BY_KIND[kind];
  if (!table || !isUuid(listingId) || !isUuid(userId)) return null;

  let q = getSupabaseAdmin()
    .from(table)
    .select('id, poster_id')
    .eq('id', listingId)
    .eq('poster_id', userId);
  if (kind === 'businesses' || kind === 'professionals') {
    q = q.eq('vertical', kind);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * List people who saved a listing. Owner-only; Grow/Elite subscription required.
 */
async function listListingSaversForOwner(userId, { kind, listingId, page = 1, limit = 30 } = {}) {
  if (!isValidKind(kind) || !isUuid(listingId)) {
    return { ok: false, status: 400, message: 'Njoftim i pavlefshëm.' };
  }

  const owned = await assertOwnedListing(userId, kind, listingId);
  if (!owned) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }

  const entitled = await posterHasTrustBadge(userId);
  if (!entitled) {
    return {
      ok: false,
      status: 403,
      code: 'PACKAGE_REQUIRED',
      message:
        'Shikimi i personave që kanë ruajtur njoftimin është i disponueshëm me paketën Grow ose Elite.',
    };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  const sb = getSupabaseAdmin();
  const { data: rows, error, count } = await sb
    .from('saved_listings')
    .select('id, saver_id, created_at', { count: 'exact' })
    .eq('listing_kind', kind)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;

  const saverIds = [...new Set((rows || []).map((r) => String(r.saver_id)).filter(isUuid))];
  const profileById = new Map();
  if (saverIds.length) {
    const { data: profiles, error: profileErr } = await sb
      .from('profiles')
      .select('id, account_type, first_name, last_name, business_name, business_owner, avatar_url')
      .in('id', saverIds);
    if (profileErr) throw profileErr;
    for (const p of profiles || []) {
      profileById.set(String(p.id), p);
    }
  }

  const savers = (rows || []).map((row) => {
    const profile = profileById.get(String(row.saver_id));
    const name = displayNameFromProfile(profile) || 'Përdorues';
    return {
      id: String(row.saver_id),
      name,
      avatarUrl: profile?.avatar_url?.trim() || null,
      savedAt: row.created_at,
    };
  });

  const total = typeof count === 'number' ? count : savers.length;
  return {
    ok: true,
    savers,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit) || 1),
  };
}

module.exports = {
  listListingSaversForOwner,
};
