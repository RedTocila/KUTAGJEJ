'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const TABLE_BY_KIND = {
  'real-estate': { table: 'real_estate_listings', vertical: null },
  car: { table: 'car_listings', vertical: null },
  job: { table: 'job_listings', vertical: null },
  marketplace: { table: 'marketplace_listings', vertical: null },
  businesses: { table: 'directory_listings', vertical: 'businesses' },
  professionals: { table: 'directory_listings', vertical: 'professionals' },
};

/** Soft-FK tables keyed by metric listing_kind (car/job, not cars/jobs). */
const RELATED_BY_KIND = [
  'saved_listings',
  'listing_auto_refresh',
  'listing_engagements',
  'listing_metric_dedups',
];

function isValidKind(kind) {
  return Boolean(TABLE_BY_KIND[kind]);
}

/**
 * Hard-delete a listing owned by userId.
 * Related soft-FK rows (saves, auto-refresh, metrics) are cleaned first.
 * Conversations are kept so chat history remains.
 *
 * @returns {{ ok: true, id: string, kind: string } | { ok: false, status: number, message: string }}
 */
async function deleteOwnerListing({ userId, kind, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isValidKind(kind) || !isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const cfg = TABLE_BY_KIND[kind];
  const sb = getSupabaseAdmin();
  const id = String(listingId);

  let listingQ = sb.from(cfg.table).select('id, poster_id').eq('id', id);
  if (cfg.vertical) listingQ = listingQ.eq('vertical', cfg.vertical);
  const { data: listing, error: listingErr } = await listingQ.maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të fshini këtë njoftim.' };
  }

  for (const table of RELATED_BY_KIND) {
    const { error } = await sb.from(table).delete().eq('listing_kind', kind).eq('listing_id', id);
    if (error) throw error;
  }

  let delQ = sb.from(cfg.table).delete().eq('id', id).eq('poster_id', userId);
  if (cfg.vertical) delQ = delQ.eq('vertical', cfg.vertical);
  const { error: delErr } = await delQ;
  if (delErr) throw delErr;

  return { ok: true, id, kind };
}

/**
 * Delete multiple owned listings. Continues on per-item failures.
 * @param {{ userId: string, items: Array<{ kind: string, id: string }> }}
 * @returns {{ ok: true, deleted: Array<{ kind: string, id: string }>, failed: Array<{ kind: string, id: string, message: string }> }}
 */
async function deleteOwnerListings({ userId, items }) {
  const deleted = [];
  const failed = [];
  const seen = new Set();

  for (const raw of items || []) {
    const kind = String(raw?.kind || '').trim();
    const id = String(raw?.id || '').trim();
    const key = `${kind}:${id}`;
    if (!kind || !id || seen.has(key)) continue;
    seen.add(key);

    try {
      const result = await deleteOwnerListing({ userId, kind, listingId: id });
      if (result.ok) {
        deleted.push({ kind: result.kind, id: result.id });
      } else {
        failed.push({ kind, id, message: result.message });
      }
    } catch (err) {
      failed.push({ kind, id, message: err?.message || 'Server error' });
    }
  }

  return { ok: true, deleted, failed };
}

module.exports = {
  isValidKind,
  deleteOwnerListing,
  deleteOwnerListings,
  TABLE_BY_KIND,
};
