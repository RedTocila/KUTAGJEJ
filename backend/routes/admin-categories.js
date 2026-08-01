const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const CATEGORY_KEYS = ['real-estate', 'job-listings', 'cars', 'marketplace', 'businesses', 'professionals'];

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function format(row) {
  const c = camelizeRows([row])[0];
  return {
    key: c.key,
    title: c.title,
    slug: c.slug,
    listingTypes: (c.listingTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    apartmentTypes: (c.apartmentTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    updatedAt: c.updatedAt,
  };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function normalizeListingTypeSlug(s) {
  return normalizeSlug(s);
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin().from('listing_categories').select('*').order('key', { ascending: true });
    if (error) throw error;
    res.json({ categories: (data || []).map((d) => format(d)) });
  } catch (error) {
    console.error('GET /admin/categories:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    if (!CATEGORY_KEYS.includes(key)) {
      return res.status(404).json({ message: 'Kategoria nuk ekziston.' });
    }

    const sb = getSupabaseAdmin();
    const { data: doc, error: findError } = await sb.from('listing_categories').select('*').eq('key', key).maybeSingle();
    if (findError) throw findError;
    if (!doc) return res.status(404).json({ message: 'Kategoria nuk u gjet.' });

    const { title, slug, listingTypes, apartmentTypes } = req.body;
    const patch = {};

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: 'Titulli nuk mund të jetë bosh.' });
      patch.title = t;
    }

    if (slug !== undefined) {
      const s = normalizeSlug(slug);
      if (!s) return res.status(400).json({ message: 'Slug-i është i pavlefshëm.' });
      if (!SLUG_RE.test(s)) return res.status(400).json({ message: 'Përdorni vetëm shkronja të vogla, numra dhe vizat.' });
      const { data: conflict, error: conflictError } = await sb
        .from('listing_categories')
        .select('key')
        .eq('slug', s)
        .neq('key', key)
        .maybeSingle();
      if (conflictError) throw conflictError;
      if (conflict) {
        return res.status(400).json({ message: 'Një kategori tjetër përdor tashmë këtë slug.' });
      }
      patch.slug = s;
    }

    if (listingTypes !== undefined) {
      if (!Array.isArray(listingTypes)) {
        return res.status(400).json({ message: 'listingTypes duhet të jetë një listë.' });
      }
      const seen = new Set();
      const next = [];
      for (const row of listingTypes) {
        const label = String(row?.label ?? '').trim();
        let rawSlug = String(row?.slug ?? '').trim();
        if (!rawSlug) rawSlug = label;
        const ls = normalizeListingTypeSlug(rawSlug);
        if (!label) return res.status(400).json({ message: 'Çdo lloj listimi duhet të ketë një etiketë.' });
        if (!ls) return res.status(400).json({ message: `Slug i pavlefshëm për: ${label}` });
        if (!SLUG_RE.test(ls)) {
          return res.status(400).json({ message: `Slug i pavlefshëm për «${label}».` });
        }
        if (seen.has(ls)) return res.status(400).json({ message: `Slug i përsëritur: ${ls}` });
        seen.add(ls);
        next.push({ slug: ls, label });
      }
      patch.listing_types = next;
    }

    if (apartmentTypes !== undefined) {
      if (key !== 'real-estate') {
        return res.status(400).json({ message: 'apartmentTypes applies only to the real-estate vertical.' });
      }
      if (!Array.isArray(apartmentTypes)) {
        return res.status(400).json({ message: 'apartmentTypes must be an array.' });
      }
      const seenA = new Set();
      const nextA = [];
      for (const row of apartmentTypes) {
        const label = String(row?.label ?? '').trim();
        let rawSlug = String(row?.slug ?? '').trim();
        if (!rawSlug) rawSlug = label;
        const ls = normalizeListingTypeSlug(rawSlug);
        if (!label) return res.status(400).json({ message: 'Each apartment type must have a label.' });
        if (!ls) return res.status(400).json({ message: `Invalid apartment type slug for: ${label}` });
        if (!SLUG_RE.test(ls)) {
          return res.status(400).json({ message: `Invalid apartment type slug for «${label}».` });
        }
        if (seenA.has(ls)) return res.status(400).json({ message: `Duplicate apartment type slug: ${ls}` });
        seenA.add(ls);
        nextA.push({ slug: ls, label });
      }
      patch.apartment_types = nextA;
    }

    patch.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await sb
      .from('listing_categories')
      .update(patch)
      .eq('key', key)
      .select('*')
      .single();
    if (updateError) {
      if (updateError.code === '23505') {
        return res.status(400).json({ message: 'Slug-i është i zënë.' });
      }
      throw updateError;
    }

    res.json({ category: format(updated) });
  } catch (error) {
    console.error('PATCH /admin/categories/:key:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
