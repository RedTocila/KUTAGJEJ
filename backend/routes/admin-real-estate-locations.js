const express = require('express');
const mongoose = require('mongoose');
const RealEstateCity = require('../models/RealEstateCity');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.user || req.user.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Only platform administrators can use this.' });
  }
  next();
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function formatCity(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    zones: (o.zones || []).map((z) => ({
      id: String(z._id),
      name: z.name,
      slug: z.slug,
    })),
    updatedAt: o.updatedAt,
  };
}

function parseZonesInput(rawZones) {
  if (!Array.isArray(rawZones)) return { ok: false, message: 'zones must be an array.' };
  const seen = new Set();
  const zones = [];
  for (const row of rawZones) {
    const name = String(row?.name ?? '').trim();
    let slug = normalizeSlug(row?.slug ?? '');
    if (!name) return { ok: false, message: 'Each zone must have a name.' };
    if (!slug) slug = normalizeSlug(name);
    if (!slug || !SLUG_RE.test(slug)) return { ok: false, message: `Invalid zone slug for «${name}».` };
    if (seen.has(slug)) return { ok: false, message: `Duplicate zone slug: ${slug}` };
    seen.add(slug);
    zones.push({ name, slug });
  }
  return { ok: true, zones };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const docs = await RealEstateCity.find().sort({ name: 1 });
    res.json({ cities: docs.map((d) => formatCity(d)) });
  } catch (error) {
    console.error('GET /admin/real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    let slug = normalizeSlug(req.body?.slug ?? '');
    if (!name) return res.status(400).json({ message: 'City name is required.' });
    if (!slug) slug = normalizeSlug(name);
    if (!slug || !SLUG_RE.test(slug)) return res.status(400).json({ message: 'Invalid city slug.' });
    const parsed = parseZonesInput(req.body?.zones ?? []);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });
    const doc = await RealEstateCity.create({ name, slug, zones: parsed.zones });
    res.status(201).json({ city: formatCity(doc) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A city with this slug already exists.' });
    }
    console.error('POST /admin/real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid city id.' });
    const doc = await RealEstateCity.findById(id);
    if (!doc) return res.status(404).json({ message: 'City not found.' });

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: 'City name cannot be empty.' });
      doc.name = name;
    }
    if (req.body.slug !== undefined) {
      const slug = normalizeSlug(req.body.slug);
      if (!slug || !SLUG_RE.test(slug)) return res.status(400).json({ message: 'Invalid city slug.' });
      const conflict = await RealEstateCity.findOne({ slug, _id: { $ne: doc._id } }).lean();
      if (conflict) return res.status(400).json({ message: 'Slug is already used by another city.' });
      doc.slug = slug;
    }
    if (req.body.zones !== undefined) {
      const parsed = parseZonesInput(req.body.zones);
      if (!parsed.ok) return res.status(400).json({ message: parsed.message });
      doc.zones = parsed.zones;
    }

    await doc.save();
    res.json({ city: formatCity(doc) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Slug conflict.' });
    }
    console.error('PATCH /admin/real-estate/locations/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid city id.' });
    const doc = await RealEstateCity.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: 'City not found.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /admin/real-estate/locations/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
