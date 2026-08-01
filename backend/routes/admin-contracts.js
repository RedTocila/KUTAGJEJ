'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { isUuid } = require('../lib/public-listings/query-helpers');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const CATEGORY_KEYS = ['real-estate', 'job-listings', 'cars', 'marketplace', 'businesses', 'professionals'];
const PLAN_CODES = ['free', 'starter', 'grow', 'elite'];

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function formatQuotas(doc) {
  return {
    maxListAllCategories: Number(doc.max_list_all_categories) || 0,
    maxJobListings: Number(doc.max_job_listings) || 0,
    maxCarListings: Number(doc.max_car_listings) || 0,
    maxApartmentListings: Number(doc.max_apartment_listings) || 0,
    maxProductListings: Number(doc.max_product_listings) || 0,
    maxPremiumListings: Number(doc.max_premium_listings) || 0,
  };
}

function formatContract(doc, categoryTitleByKey = {}, roleById = {}) {
  const roleIds = Array.isArray(doc.role_ids) ? doc.role_ids : [];
  const roles = roleIds
    .map((id) => {
      if (!id) return null;
      const r = roleById[String(id)];
      return { id: String(id), name: r?.name || '' };
    })
    .filter(Boolean);
  const catKey = doc.listing_category_key || null;
  return {
    id: String(doc.id),
    title: doc.title,
    content: doc.content || '',
    planCode: doc.plan_code || null,
    sortOrder: doc.sort_order ?? 0,
    listingCategoryKey: catKey,
    listingCategoryTitle: catKey ? categoryTitleByKey[catKey] || catKey : null,
    subscriberKind: doc.subscriber_kind || null,
    refreshEveryHours: doc.refresh_every_hours ?? null,
    glowBadgeEnabled: Boolean(doc.glow_badge_enabled),
    boostCredits: doc.boost_credits ?? null,
    dailyBoostAccess: Boolean(doc.daily_boost_access),
    ...formatQuotas(doc),
    price1Month: doc.price_1_month != null ? Number(doc.price_1_month) : null,
    price3Months: doc.price_3_months != null ? Number(doc.price_3_months) : null,
    price6Months: doc.price_6_months != null ? Number(doc.price_6_months) : null,
    price12Months: doc.price_12_months != null ? Number(doc.price_12_months) : null,
    roles,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

async function categoryTitleMapForKeys(keys) {
  const uniq = [...new Set((keys || []).filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data, error } = await getSupabaseAdmin()
    .from('listing_categories')
    .select('key, title')
    .in('key', uniq);
  if (error) throw error;
  return Object.fromEntries((data || []).map((d) => [d.key, d.title]));
}

async function loadRoleById(roleIds) {
  const uniq = [...new Set((roleIds || []).filter(Boolean).map(String))];
  if (uniq.length === 0) return {};
  const { data, error } = await getSupabaseAdmin().from('roles').select('id, name').in('id', uniq);
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [String(r.id), r]));
}

function parseOptionalPrice(value, fieldLabelSq) {
  if (value === null || value === undefined) return { ok: true, n: null };
  const s = String(value).trim();
  if (s === '') return { ok: true, n: null };
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0) {
    return { ok: false, message: `${fieldLabelSq} duhet të jetë numër ≥ 0 ose bosh.` };
  }
  return { ok: true, n: num };
}

function countSetPrices(row) {
  let c = 0;
  if (row.price_1_month != null && Number.isFinite(Number(row.price_1_month))) c += 1;
  if (row.price_3_months != null && Number.isFinite(Number(row.price_3_months))) c += 1;
  if (row.price_6_months != null && Number.isFinite(Number(row.price_6_months))) c += 1;
  if (row.price_12_months != null && Number.isFinite(Number(row.price_12_months))) c += 1;
  return c;
}

function normalizeRoleIds(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of ids) {
    const s = String(raw ?? '').trim();
    if (!s || !isUuid(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function parseNonNegInt(value, labelSq, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) return { ok: false, message: `${labelSq} është i detyrueshëm.` };
    return { ok: true, n: 0 };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return { ok: false, message: `${labelSq} duhet të jetë numër i plotë ≥ 0.` };
  }
  return { ok: true, n };
}

function parseQuotaBody(body) {
  const fields = [
    ['maxListAllCategories', 'Lista në të gjitha kategoritë', 'max_list_all_categories'],
    ['maxJobListings', 'Kuota e vendeve të punës', 'max_job_listings'],
    ['maxCarListings', 'Kuota e makinave', 'max_car_listings'],
    ['maxApartmentListings', 'Kuota e apartamenteve', 'max_apartment_listings'],
    ['maxProductListings', 'Kuota e produkteve', 'max_product_listings'],
    ['maxPremiumListings', 'Kuota e njoftimeve premium', 'max_premium_listings'],
  ];
  const out = {};
  for (const [key, label, snake] of fields) {
    if (body[key] === undefined) continue;
    const r = parseNonNegInt(body[key], label);
    if (!r.ok) return { ok: false, message: r.message };
    out[snake] = r.n;
  }
  return { ok: true, quotas: out };
}

async function formatContractResponse(doc) {
  const titleByKey = await categoryTitleMapForKeys([doc.listing_category_key]);
  const roleById = await loadRoleById(doc.role_ids);
  return formatContract(doc, titleByKey, roleById);
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('contracts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const docs = data || [];
    const titleByKey = await categoryTitleMapForKeys(docs.map((d) => d.listing_category_key));
    const allRoleIds = docs.flatMap((d) => d.role_ids || []);
    const roleById = await loadRoleById(allRoleIds);
    res.json({ contracts: docs.map((d) => formatContract(d, titleByKey, roleById)) });
  } catch (error) {
    console.error('GET /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      title,
      content,
      roleIds,
      listingCategoryKey,
      subscriberKind,
      refreshEveryHours,
      glowBadgeEnabled,
      boostCredits,
      dailyBoostAccess,
      price1Month,
      price3Months,
      price6Months,
      price12Months,
      planCode,
      sortOrder,
    } = req.body;

    const p1 = parseOptionalPrice(price1Month, 'Çmimi 1 muaj');
    const p3 = parseOptionalPrice(price3Months, 'Çmimi 3 muaj');
    const p6 = parseOptionalPrice(price6Months, 'Çmimi 6 muaj');
    const p12 = parseOptionalPrice(price12Months, 'Çmimi 12 muaj');
    if (!p1.ok) return res.status(400).json({ message: p1.message });
    if (!p3.ok) return res.status(400).json({ message: p3.message });
    if (!p6.ok) return res.status(400).json({ message: p6.message });
    if (!p12.ok) return res.status(400).json({ message: p12.message });

    if (p1.n == null && p3.n == null && p6.n == null && p12.n == null) {
      return res.status(400).json({
        message: 'Vendosni të paktën një çmim (1, 3, 6 ose 12 muaj). Lini bosh fushat që nuk përdoren.',
      });
    }

    const sb = getSupabaseAdmin();
    let catKey = null;
    if (listingCategoryKey != null && String(listingCategoryKey).trim() !== '') {
      catKey = String(listingCategoryKey).trim();
      if (!CATEGORY_KEYS.includes(catKey)) {
        return res.status(400).json({ message: 'Zgjidhni një kategori kontrate.' });
      }
      const { data: cat, error: catErr } = await sb
        .from('listing_categories')
        .select('key')
        .eq('key', catKey)
        .maybeSingle();
      if (catErr) throw catErr;
      if (!cat) {
        return res.status(400).json({ message: 'Kategoria nuk ekziston.' });
      }
    }

    const kind = String(subscriberKind || '').trim();
    if (kind !== 'agent' && kind !== 'company') {
      return res.status(400).json({ message: 'Lloji i abonentit duhet të jetë agjent ose kompani.' });
    }

    const refreshH = Number(refreshEveryHours);
    if (!Number.isFinite(refreshH) || refreshH < 1) {
      return res.status(400).json({ message: 'Rifreskimi çdo sa orë duhet të jetë të paktën 1.' });
    }

    const boost = Number(boostCredits);
    if (!Number.isFinite(boost) || boost < 0) {
      return res.status(400).json({ message: 'Kreditet boost duhet të jenë numër jo negativ.' });
    }

    const quotaParse = parseQuotaBody(req.body);
    if (!quotaParse.ok) return res.status(400).json({ message: quotaParse.message });

    const t = String(title || '').trim();
    if (!t) {
      return res.status(400).json({ message: 'Titulli është i detyrueshëm.' });
    }

    const roleObjectIds = normalizeRoleIds(roleIds);
    if (roleObjectIds.length === 0) {
      return res.status(400).json({ message: 'Zgjidhni të paktën një rol nga katalogu.' });
    }

    const { data: foundRoles, error: roleErr } = await sb
      .from('roles')
      .select('id')
      .in('id', roleObjectIds);
    if (roleErr) throw roleErr;
    if ((foundRoles || []).length !== roleObjectIds.length) {
      return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
    }

    let code = null;
    if (planCode != null && String(planCode).trim() !== '') {
      code = String(planCode).trim().toLowerCase();
      if (!PLAN_CODES.includes(code)) {
        return res.status(400).json({ message: 'Kodi i planit është i pavlefshëm.' });
      }
    }

    const sort = sortOrder === undefined || sortOrder === '' ? 0 : Number(sortOrder);
    if (!Number.isFinite(sort)) {
      return res.status(400).json({ message: 'Renditja duhet të jetë numër.' });
    }

    const { data: created, error: insertErr } = await sb
      .from('contracts')
      .insert({
        title: t,
        content: content !== undefined ? String(content) : '',
        plan_code: code,
        sort_order: sort,
        listing_category_key: catKey,
        subscriber_kind: kind,
        refresh_every_hours: refreshH,
        glow_badge_enabled: Boolean(glowBadgeEnabled),
        boost_credits: boost,
        daily_boost_access: Boolean(dailyBoostAccess),
        ...quotaParse.quotas,
        price_1_month: p1.n,
        price_3_months: p3.n,
        price_6_months: p6.n,
        price_12_months: p12.n,
        role_ids: roleObjectIds,
        created_by: req.admin.id,
      })
      .select('*')
      .single();
    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(400).json({ message: 'Ky plan (kod + lloj abonenti) ekziston tashmë.' });
      }
      throw insertErr;
    }

    res.status(201).json({ contract: await formatContractResponse(created) });
  } catch (error) {
    console.error('POST /admin/contracts:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const sb = getSupabaseAdmin();
    const { data: existing, error: findErr } = await sb
      .from('contracts')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });

    const {
      title,
      content,
      roleIds,
      listingCategoryKey,
      subscriberKind,
      refreshEveryHours,
      glowBadgeEnabled,
      boostCredits,
      dailyBoostAccess,
      price1Month,
      price3Months,
      price6Months,
      price12Months,
      planCode,
      sortOrder,
    } = req.body;

    const patch = { updated_at: new Date().toISOString() };

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: 'Titulli nuk mund të jetë bosh.' });
      patch.title = t;
    }
    if (content !== undefined) patch.content = String(content);

    if (planCode !== undefined) {
      if (planCode === null || String(planCode).trim() === '') {
        patch.plan_code = null;
      } else {
        const code = String(planCode).trim().toLowerCase();
        if (!PLAN_CODES.includes(code)) {
          return res.status(400).json({ message: 'Kodi i planit është i pavlefshëm.' });
        }
        patch.plan_code = code;
      }
    }

    if (sortOrder !== undefined) {
      const sort = Number(sortOrder);
      if (!Number.isFinite(sort)) {
        return res.status(400).json({ message: 'Renditja duhet të jetë numër.' });
      }
      patch.sort_order = sort;
    }

    if (listingCategoryKey !== undefined) {
      if (listingCategoryKey === null || String(listingCategoryKey).trim() === '') {
        patch.listing_category_key = null;
      } else {
        const catKey = String(listingCategoryKey).trim();
        if (!CATEGORY_KEYS.includes(catKey)) {
          return res.status(400).json({ message: 'Kategori e pavlefshme.' });
        }
        const { data: cat, error: catErr } = await sb
          .from('listing_categories')
          .select('key')
          .eq('key', catKey)
          .maybeSingle();
        if (catErr) throw catErr;
        if (!cat) return res.status(400).json({ message: 'Kategoria nuk ekziston.' });
        patch.listing_category_key = catKey;
      }
    }

    if (subscriberKind !== undefined) {
      const kind = String(subscriberKind || '').trim();
      if (kind !== 'agent' && kind !== 'company') {
        return res.status(400).json({ message: 'Lloji i abonentit duhet të jetë agjent ose kompani.' });
      }
      patch.subscriber_kind = kind;
    }

    if (refreshEveryHours !== undefined) {
      const refreshH = Number(refreshEveryHours);
      if (!Number.isFinite(refreshH) || refreshH < 1) {
        return res.status(400).json({ message: 'Rifreskimi çdo sa orë duhet të jetë të paktën 1.' });
      }
      patch.refresh_every_hours = refreshH;
    }

    if (glowBadgeEnabled !== undefined) patch.glow_badge_enabled = Boolean(glowBadgeEnabled);
    if (dailyBoostAccess !== undefined) patch.daily_boost_access = Boolean(dailyBoostAccess);

    if (boostCredits !== undefined) {
      const boost = Number(boostCredits);
      if (!Number.isFinite(boost) || boost < 0) {
        return res.status(400).json({ message: 'Kreditet boost duhet të jenë numër jo negativ.' });
      }
      patch.boost_credits = boost;
    }

    const quotaParse = parseQuotaBody(req.body);
    if (!quotaParse.ok) return res.status(400).json({ message: quotaParse.message });
    Object.assign(patch, quotaParse.quotas);

    if (price1Month !== undefined) {
      if (price1Month === null || price1Month === '') {
        patch.price_1_month = null;
      } else {
        const r = parseOptionalPrice(price1Month, 'Çmimi 1 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        patch.price_1_month = r.n;
      }
    }
    if (price3Months !== undefined) {
      if (price3Months === null || price3Months === '') {
        patch.price_3_months = null;
      } else {
        const r = parseOptionalPrice(price3Months, 'Çmimi 3 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        patch.price_3_months = r.n;
      }
    }
    if (price6Months !== undefined) {
      if (price6Months === null || price6Months === '') {
        patch.price_6_months = null;
      } else {
        const r = parseOptionalPrice(price6Months, 'Çmimi 6 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        patch.price_6_months = r.n;
      }
    }
    if (price12Months !== undefined) {
      if (price12Months === null || price12Months === '') {
        patch.price_12_months = null;
      } else {
        const r = parseOptionalPrice(price12Months, 'Çmimi 12 muaj');
        if (!r.ok) return res.status(400).json({ message: r.message });
        patch.price_12_months = r.n;
      }
    }

    const pricePatchTouched =
      price1Month !== undefined ||
      price3Months !== undefined ||
      price6Months !== undefined ||
      price12Months !== undefined;
    if (pricePatchTouched && countSetPrices({ ...existing, ...patch }) === 0) {
      return res.status(400).json({
        message: 'Duhet të mbetet të paktën një çmim. Mos i boshatisni të gjitha afatet njëkohësisht.',
      });
    }

    if (roleIds !== undefined) {
      const roleObjectIds = normalizeRoleIds(roleIds);
      if (roleObjectIds.length === 0) {
        return res.status(400).json({ message: 'Zgjidhni të paktën një rol.' });
      }
      const { data: foundRoles, error: roleErr } = await sb
        .from('roles')
        .select('id')
        .in('id', roleObjectIds);
      if (roleErr) throw roleErr;
      if ((foundRoles || []).length !== roleObjectIds.length) {
        return res.status(400).json({ message: 'Një ose më shumë role nuk ekzistojnë.' });
      }
      patch.role_ids = roleObjectIds;
    }

    const { data: updated, error: updErr } = await sb
      .from('contracts')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (updErr) {
      if (updErr.code === '23505') {
        return res.status(400).json({ message: 'Ky plan (kod + lloj abonenti) ekziston tashmë.' });
      }
      throw updErr;
    }

    res.json({ contract: await formatContractResponse(updated) });
  } catch (error) {
    console.error('PATCH /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const { data, error } = await getSupabaseAdmin()
      .from('contracts')
      .delete()
      .eq('id', req.params.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Kontrata nuk u gjet.' });
    res.json({ message: 'Kontrata u fshi.' });
  } catch (error) {
    console.error('DELETE /admin/contracts/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
