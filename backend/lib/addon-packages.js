'use strict';

const { getSupabaseAdmin } = require('./supabase');

/** @typedef {'premium' | 'okazion' | 'auto-refresh'} AddonKind */

const DEFAULT_ADDON_PACKAGES = [
  {
    id: 'premium-15',
    kind: 'premium',
    days: 15,
    slots: null,
    priceEur: 18,
    priceBc: 200,
    labelSq: '15 ditë Premium',
    labelEn: '15 Days Premium Listing',
    sortOrder: 0,
  },
  {
    id: 'premium-30',
    kind: 'premium',
    days: 30,
    slots: null,
    priceEur: 27,
    priceBc: 300,
    labelSq: '30 ditë Premium',
    labelEn: '30 Days Premium Listing',
    sortOrder: 1,
  },
  {
    id: 'okazion-5',
    kind: 'okazion',
    days: 7,
    slots: null,
    priceEur: 19,
    priceBc: 250,
    labelSq: '7 ditë OKAZION',
    labelEn: '7 Days OKAZION Listing',
    sortOrder: 0,
  },
  {
    id: 'auto-refresh-10',
    kind: 'auto-refresh',
    days: null,
    slots: 10,
    priceEur: 14,
    priceBc: 150,
    labelSq: '10 njoftime Auto-Refresh',
    labelEn: '10 Listings Auto-Refresh',
    sortOrder: 0,
  },
  {
    id: 'auto-refresh-20',
    kind: 'auto-refresh',
    days: null,
    slots: 20,
    priceEur: 24,
    priceBc: 250,
    labelSq: '20 njoftime Auto-Refresh',
    labelEn: '20 Listings Auto-Refresh',
    sortOrder: 1,
  },
];

/** Plan → hours between automatic refreshes (matches contract packages). */
const REFRESH_HOURS_BY_PLAN = {
  free: 48,
  starter: 24,
  grow: 12,
  elite: 6,
};

/** @type {Map<string, object>} */
let cacheById = new Map();
/** @type {boolean} */
let cacheReady = false;

function mapRow(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    days: row.days == null ? null : Number(row.days),
    slots: row.slots == null ? null : Number(row.slots),
    priceEur: Number(row.price_eur),
    priceBc: Number(row.price_bc),
    labelSq: row.label_sq || '',
    labelEn: row.label_en || '',
    active: row.active !== false,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function toPublicPack(pkg) {
  if (!pkg) return null;
  if (pkg.kind === 'auto-refresh') {
    return {
      id: pkg.id,
      slots: pkg.slots,
      priceEur: pkg.priceEur,
      priceBc: pkg.priceBc,
      labelSq: pkg.labelSq,
      labelEn: pkg.labelEn,
    };
  }
  return {
    id: pkg.id,
    days: pkg.days,
    priceEur: pkg.priceEur,
    priceBc: pkg.priceBc,
    labelSq: pkg.labelSq,
    labelEn: pkg.labelEn,
  };
}

function seedFallbackCache() {
  cacheById = new Map(
    DEFAULT_ADDON_PACKAGES.map((p) => [
      p.id,
      {
        ...p,
        active: true,
      },
    ]),
  );
  cacheReady = true;
}

async function reloadAddonPackagesCache() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('addon_packages')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) {
      seedFallbackCache();
      return;
    }
    cacheById = new Map(data.map((row) => [String(row.id), mapRow(row)]));
    cacheReady = true;
  } catch (err) {
    console.warn('addon_packages cache reload failed, using defaults:', err?.message || err);
    if (!cacheReady) seedFallbackCache();
  }
}

async function ensureAddonPackages() {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (const pkg of DEFAULT_ADDON_PACKAGES) {
    const { data: existing, error: findErr } = await sb
      .from('addon_packages')
      .select('id')
      .eq('id', pkg.id)
      .maybeSingle();
    if (findErr) {
      // Table may not exist yet on older DBs — fall back to in-memory defaults.
      console.warn('ensureAddonPackages:', findErr.message || findErr);
      seedFallbackCache();
      return;
    }

    const row = {
      kind: pkg.kind,
      days: pkg.days,
      slots: pkg.slots,
      price_eur: pkg.priceEur,
      price_bc: pkg.priceBc,
      label_sq: pkg.labelSq,
      label_en: pkg.labelEn,
      sort_order: pkg.sortOrder,
      updated_at: now,
    };

    if (existing) {
      // Do not overwrite admin price/label edits on every boot — only fill missing rows.
      continue;
    }
    const { error } = await sb.from('addon_packages').insert({
      id: pkg.id,
      ...row,
      active: true,
      created_at: now,
    });
    if (error) {
      console.warn('ensureAddonPackages insert:', error.message || error);
      seedFallbackCache();
      return;
    }
  }

  await reloadAddonPackagesCache();
  console.log(`✓ Synced addon packages (${cacheById.size} in catalog)`);
}

function listAddonPackages(kind, { activeOnly = true } = {}) {
  if (!cacheReady) seedFallbackCache();
  const rows = [...cacheById.values()]
    .filter((p) => (!kind || p.kind === kind) && (!activeOnly || p.active))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return rows;
}

function getAddonPackage(packageId, { activeOnly = true } = {}) {
  if (!cacheReady) seedFallbackCache();
  const pkg = cacheById.get(String(packageId || '').trim());
  if (!pkg) return null;
  if (activeOnly && !pkg.active) return null;
  return pkg;
}

function listPremiumPackages() {
  return listAddonPackages('premium').map(toPublicPack);
}

function getPremiumPackage(packageId) {
  const pkg = getAddonPackage(packageId);
  return pkg && pkg.kind === 'premium' ? toPublicPack(pkg) : null;
}

function listOkazionPackages() {
  return listAddonPackages('okazion').map(toPublicPack);
}

function getOkazionPackage(packageId) {
  const pkg = getAddonPackage(packageId);
  return pkg && pkg.kind === 'okazion' ? toPublicPack(pkg) : null;
}

function listAutoRefreshPackages() {
  return listAddonPackages('auto-refresh').map(toPublicPack);
}

function getAutoRefreshPackage(packageId) {
  const pkg = getAddonPackage(packageId);
  return pkg && pkg.kind === 'auto-refresh' ? toPublicPack(pkg) : null;
}

function refreshHoursForPlanCode(planCode) {
  const key = String(planCode || 'free').toLowerCase();
  return REFRESH_HOURS_BY_PLAN[key] ?? REFRESH_HOURS_BY_PLAN.free;
}

module.exports = {
  DEFAULT_ADDON_PACKAGES,
  REFRESH_HOURS_BY_PLAN,
  ensureAddonPackages,
  reloadAddonPackagesCache,
  listAddonPackages,
  getAddonPackage,
  mapRow,
  toPublicPack,
  listPremiumPackages,
  getPremiumPackage,
  listOkazionPackages,
  getOkazionPackage,
  listAutoRefreshPackages,
  getAutoRefreshPackage,
  refreshHoursForPlanCode,
};
