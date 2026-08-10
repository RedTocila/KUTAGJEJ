'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const {
  listAddonPackages,
  mapRow,
  reloadAddonPackagesCache,
} = require('../lib/addon-packages');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const KINDS = new Set(['premium', 'okazion', 'auto-refresh']);

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function parseNonNegative(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: `${label} duhet të jetë numër ≥ 0.` };
  }
  return { ok: true, n };
}

function parsePositiveInt(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    return { ok: false, message: `${label} duhet të jetë numër i plotë ≥ 1.` };
  }
  return { ok: true, n };
}

function slugifyId(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (req, res) => {
  try {
    const kind = String(req.query.kind || '').trim();
    if (kind && !KINDS.has(kind)) {
      return res.status(400).json({ message: 'Lloji i paketës nuk njihet.' });
    }
    // Prefer live DB for admin so edits are always current.
    let query = getSupabaseAdmin().from('addon_packages').select('*').order('sort_order', { ascending: true }).order('id', { ascending: true });
    if (kind) query = query.eq('kind', kind);
    const { data, error } = await query;
    if (error) {
      // Fallback to cache if table missing
      console.warn('GET /admin/addon-packages DB miss:', error.message || error);
      const packages = listAddonPackages(kind || undefined, { activeOnly: false });
      return res.json({ packages });
    }
    res.json({ packages: (data || []).map(mapRow) });
  } catch (error) {
    console.error('GET /admin/addon-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const kind = String(body.kind || '').trim();
    if (!KINDS.has(kind)) {
      return res.status(400).json({ message: 'Lloji i paketës është i detyrueshëm (premium / okazion / auto-refresh).' });
    }

    let id = slugifyId(body.id);
    if (!id) {
      const suffix = kind === 'auto-refresh' ? body.slots : body.days;
      id = slugifyId(`${kind}-${suffix}`);
    }
    if (!id) return res.status(400).json({ message: 'ID e paketës është e detyrueshme.' });

    const priceEur = parseNonNegative(body.priceEur, 'Çmimi EUR');
    if (!priceEur.ok) return res.status(400).json({ message: priceEur.message });
    const priceBc = parsePositiveInt(body.priceBc, 'Çmimi BC');
    if (!priceBc.ok) return res.status(400).json({ message: priceBc.message });

    const labelSq = String(body.labelSq || '').trim();
    if (!labelSq) return res.status(400).json({ message: 'Etiketa është e detyrueshme.' });

    let days = null;
    let slots = null;
    if (kind === 'auto-refresh') {
      const s = parsePositiveInt(body.slots, 'Slotet');
      if (!s.ok) return res.status(400).json({ message: s.message });
      slots = s.n;
    } else {
      const d = parsePositiveInt(body.days, 'Ditët');
      if (!d.ok) return res.status(400).json({ message: d.message });
      days = d.n;
    }

    const now = new Date().toISOString();
    const { data, error } = await getSupabaseAdmin()
      .from('addon_packages')
      .insert({
        id,
        kind,
        days,
        slots,
        price_eur: priceEur.n,
        price_bc: priceBc.n,
        label_sq: labelSq,
        label_en: String(body.labelEn || '').trim(),
        active: body.active === undefined ? true : Boolean(body.active),
        sort_order: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    if (error) {
      if (String(error.code) === '23505') {
        return res.status(409).json({ message: 'Ekziston tashmë një paketë me këtë ID.' });
      }
      throw error;
    }
    await reloadAddonPackagesCache();
    res.status(201).json({ package: mapRow(data) });
  } catch (error) {
    console.error('POST /admin/addon-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ message: 'ID e pavlefshme.' });

    const sb = getSupabaseAdmin();
    const { data: existing, error: findErr } = await sb.from('addon_packages').select('*').eq('id', id).maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ message: 'Paketa nuk u gjet.' });

    const body = req.body || {};
    const patch = { updated_at: new Date().toISOString() };

    if (body.priceEur !== undefined) {
      const p = parseNonNegative(body.priceEur, 'Çmimi EUR');
      if (!p.ok) return res.status(400).json({ message: p.message });
      patch.price_eur = p.n;
    }
    if (body.priceBc !== undefined) {
      const p = parsePositiveInt(body.priceBc, 'Çmimi BC');
      if (!p.ok) return res.status(400).json({ message: p.message });
      patch.price_bc = p.n;
    }
    if (body.labelSq !== undefined) {
      const label = String(body.labelSq || '').trim();
      if (!label) return res.status(400).json({ message: 'Etiketa është e detyrueshme.' });
      patch.label_sq = label;
    }
    if (body.labelEn !== undefined) patch.label_en = String(body.labelEn || '').trim();
    if (body.active !== undefined) patch.active = Boolean(body.active);
    if (body.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
      patch.sort_order = Number(body.sortOrder);
    }

    if (existing.kind === 'auto-refresh' && body.slots !== undefined) {
      const s = parsePositiveInt(body.slots, 'Slotet');
      if (!s.ok) return res.status(400).json({ message: s.message });
      patch.slots = s.n;
    }
    if ((existing.kind === 'premium' || existing.kind === 'okazion') && body.days !== undefined) {
      const d = parsePositiveInt(body.days, 'Ditët');
      if (!d.ok) return res.status(400).json({ message: d.message });
      patch.days = d.n;
    }

    const { data, error } = await sb.from('addon_packages').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    await reloadAddonPackagesCache();
    res.json({ package: mapRow(data) });
  } catch (error) {
    console.error('PATCH /admin/addon-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ message: 'ID e pavlefshme.' });

    // Soft-delete: deactivate so historical vouchers keep a stable package_id.
    const { data, error } = await getSupabaseAdmin()
      .from('addon_packages')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Paketa nuk u gjet.' });
    await reloadAddonPackagesCache();
    res.json({ ok: true, package: mapRow(data) });
  } catch (error) {
    console.error('DELETE /admin/addon-packages:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
