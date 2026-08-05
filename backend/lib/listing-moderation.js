const { getSupabaseAdmin } = require('./supabase');
const { camelizeRow, camelizeRows, modelNameFromAccount } = require('./profiles');
const { PUBLIC_LISTING_STATUS_FILTER, LISTING_STATUSES } = require('./listing-moderation-fields');
const { buildCityIndex, isUuid, mergeSpecs } = require('./public-listings/query-helpers');

const LISTING_KINDS = {
  'real-estate': {
    table: 'real_estate_listings',
    label: 'Prona',
    title: (doc) => doc.title,
  },
  cars: {
    table: 'car_listings',
    label: 'Makina',
    title: (doc) => `${doc.make} ${doc.model}`.trim(),
  },
  jobs: {
    table: 'job_listings',
    label: 'Punë',
    title: (doc) => doc.title,
  },
  marketplace: {
    table: 'marketplace_listings',
    label: 'Tregu',
    title: (doc) => doc.title,
  },
  businesses: {
    table: 'directory_listings',
    label: 'Biznese',
    title: (doc) => doc.title,
    extraFilter: { vertical: 'businesses' },
  },
  professionals: {
    table: 'directory_listings',
    label: 'Profesionistë',
    title: (doc) => doc.title,
    extraFilter: { vertical: 'professionals' },
  },
};

/** Merges a FilterSpec fragment with the "publicly visible" (approved) status condition. */
function mergePublicFilter(spec = {}) {
  return mergeSpecs(spec, { eq: { status: 'approved' } });
}

function getKindConfig(kind) {
  return LISTING_KINDS[kind] || null;
}

function listingTitle(kind, doc) {
  const cfg = getKindConfig(kind);
  return cfg ? cfg.title(doc) : doc.title || 'Njoftim';
}

function applyExtraFilter(query, cfg) {
  let q = query;
  if (cfg.extraFilter) {
    for (const [col, val] of Object.entries(cfg.extraFilter)) q = q.eq(col, val);
  }
  return q;
}

/**
 * No-op under Postgres: `status` is a NOT NULL enum column with a default,
 * so rows can never be missing a status the way legacy Mongo docs could.
 * Kept for call-site compatibility.
 */
async function backfillListingStatuses() {
  return Object.fromEntries(LISTING_STATUSES.map((s) => [s, 0]));
}

async function createAdminNotification({ type, refKind, refId, title, message }) {
  const { error } = await getSupabaseAdmin().from('admin_notifications').insert({
    type,
    ref_kind: refKind || '',
    ref_id: refId ?? null,
    title,
    message: message || '',
  });
  if (error) throw error;
}

async function notifyAdminsListingSubmitted(kind, listingId, title) {
  const label = getKindConfig(kind)?.label ?? kind;
  await createAdminNotification({
    type: 'listing_submitted',
    refKind: kind,
    refId: listingId,
    title: title || 'Njoftim i ri',
    message: `Njoftim i ri u publikua në ${label}.`,
  });
}

/** Batch-resolve `posterId -> 'IndividualUser'|'BusinessUser'|null` via profiles.account_type. */
async function loadPosterModelMap(posterIds) {
  const ids = [...new Set((posterIds || []).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const { data, error } = await getSupabaseAdmin().from('profiles').select('id, account_type').in('id', ids);
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    map.set(row.id, modelNameFromAccount(row.account_type));
  }
  return map;
}

function formatAdminListing(kind, doc, cityById, posterModelMap) {
  const city = doc.cityId ? cityById.get(doc.cityId) : null;
  return {
    id: doc.id,
    kind,
    kindLabel: getKindConfig(kind)?.label ?? kind,
    title: listingTitle(kind, doc),
    status: doc.status || 'pending',
    posterId: doc.posterId,
    posterModel: posterModelMap?.get(doc.posterId) ?? null,
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
  const sb = getSupabaseAdmin();
  const skip = (Math.max(1, page) - 1) * limit;
  const kinds = kind && getKindConfig(kind) ? [kind] : Object.keys(LISTING_KINDS);
  const items = [];

  for (const k of kinds) {
    const cfg = getKindConfig(k);
    let q = sb.from(cfg.table).select('*').order('created_at', { ascending: false }).limit(200);
    q = applyExtraFilter(q, cfg);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    for (const doc of camelizeRows(data)) {
      items.push({ kind: k, doc, createdAt: doc.createdAt });
    }
  }

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const slice = items.slice(skip, skip + limit);
  const [cityById, posterModelMap] = await Promise.all([
    buildCityIndex(slice.map((row) => row.doc)),
    loadPosterModelMap(slice.map((row) => row.doc.posterId)),
  ]);
  const listings = slice.map((row) => formatAdminListing(row.kind, row.doc, cityById, posterModelMap));

  let total = 0;
  for (const k of kinds) {
    const cfg = getKindConfig(k);
    let q = sb.from(cfg.table).select('*', { count: 'exact', head: true });
    q = applyExtraFilter(q, cfg);
    if (status !== 'all') q = q.eq('status', status);
    const { count, error } = await q;
    if (error) throw error;
    total += count ?? 0;
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
  if (!isUuid(listingId)) {
    return { ok: false, status: 400, message: 'ID e pavlefshme.' };
  }

  const sb = getSupabaseAdmin();
  let selectQ = sb.from(cfg.table).select('*').eq('id', listingId);
  selectQ = applyExtraFilter(selectQ, cfg);
  const { data: existing, error: selErr } = await selectQ.maybeSingle();
  if (selErr) throw selErr;
  if (!existing) return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };

  const status = decision === 'approve' ? 'approved' : 'rejected';
  if (existing.status === status) {
    return { ok: false, status: 409, message: 'Ky njoftim ka tashmë këtë status.' };
  }

  const { data: updated, error: updErr } = await sb
    .from(cfg.table)
    .update({
      status,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      admin_note: String(adminNote ?? '').trim().slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('*')
    .single();
  if (updErr) throw updErr;

  const doc = camelizeRow(updated);
  const [cityById, posterModelMap] = await Promise.all([
    buildCityIndex([doc]),
    loadPosterModelMap([doc.posterId]),
  ]);

  return {
    ok: true,
    listing: formatAdminListing(kind, doc, cityById, posterModelMap),
  };
}

async function countListingsByStatus() {
  const sb = getSupabaseAdmin();
  const out = {};
  for (const [kind, cfg] of Object.entries(LISTING_KINDS)) {
    const countFor = async (statusValue) => {
      let q = sb.from(cfg.table).select('*', { count: 'exact', head: true });
      q = applyExtraFilter(q, cfg);
      if (statusValue) q = q.eq('status', statusValue);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    };
    const [total, pending, approved, rejected] = await Promise.all([
      countFor(), countFor('pending'), countFor('approved'), countFor('rejected'),
    ]);
    out[kind] = { total, pending, approved, rejected };
  }
  return out;
}

module.exports = {
  LISTING_KINDS,
  PUBLIC_LISTING_STATUS_FILTER,
  mergePublicFilter,
  getKindConfig,
  backfillListingStatuses,
  notifyAdminsListingSubmitted,
  createAdminNotification,
  loadPosterModelMap,
  formatAdminListing,
  listAdminListings,
  reviewListing,
  countListingsByStatus,
  listingTitle,
};
