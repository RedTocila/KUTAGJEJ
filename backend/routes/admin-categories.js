const express = require('express');
const ListingCategory = require('../models/ListingCategory');
const { CATEGORY_KEYS } = require('../models/ListingCategory');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function format(doc) {
  return {
    key: doc.key,
    title: doc.title,
    slug: doc.slug,
    listingTypes: (doc.listingTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    updatedAt: doc.updatedAt,
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
    const docs = await ListingCategory.find().sort({ key: 1 }).lean();
    res.json({ categories: docs.map((d) => format(d)) });
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

    const doc = await ListingCategory.findOne({ key });
    if (!doc) return res.status(404).json({ message: 'Kategoria nuk u gjet.' });

    const { title, slug, listingTypes } = req.body;

    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) return res.status(400).json({ message: 'Titulli nuk mund të jetë bosh.' });
      doc.title = t;
    }

    if (slug !== undefined) {
      const s = normalizeSlug(slug);
      if (!s) return res.status(400).json({ message: 'Slug-i është i pavlefshëm.' });
      if (!SLUG_RE.test(s)) return res.status(400).json({ message: 'Përdorni vetëm shkronja të vogla, numra dhe vizat.' });
      const conflict = await ListingCategory.findOne({ slug: s, key: { $ne: key } }).lean();
      if (conflict) {
        return res.status(400).json({ message: 'Një kategori tjetër përdor tashmë këtë slug.' });
      }
      doc.slug = s;
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
      doc.listingTypes = next;
    }

    await doc.save();
    res.json({ category: format(doc.toObject()) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Slug-i është i zënë.' });
    }
    console.error('PATCH /admin/categories/:key:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
