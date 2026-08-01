const express = require('express');
const authMiddleware = require('../middleware/auth');
const HomeBanner = require('../models/HomeBanner');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës mund ta përdorin këtë funksion.' });
  }
  next();
}

function normalizePayload(body) {
  return {
    title: String(body?.title || '').trim(),
    subtitle: String(body?.subtitle || '').trim(),
    imageUrl: String(body?.imageUrl || '').trim() || '/KuTaGjejLogo.png',
    ctaLabel: String(body?.ctaLabel || '').trim(),
    ctaHref: String(body?.ctaHref || '').trim(),
    order: Number.isFinite(Number(body?.order)) ? Number(body.order) : 0,
    isActive: body?.isActive !== undefined ? Boolean(body.isActive) : true,
  };
}

function validate(payload) {
  if (!payload.title) return 'Titulli është i detyrueshëm.';
  if (payload.ctaHref && !payload.ctaHref.startsWith('/')) {
    return 'Linku duhet të fillojë me "/" (p.sh. /prona).';
  }
  return null;
}

function format(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle || '',
    imageUrl: doc.imageUrl,
    ctaLabel: doc.ctaLabel || '',
    ctaHref: doc.ctaHref || '',
    order: Number(doc.order || 0),
    isActive: Boolean(doc.isActive),
    updatedAt: doc.updatedAt,
  };
}

router.use(authMiddleware, requirePlatformAdmin);

router.get('/', async (_req, res) => {
  try {
    const docs = await HomeBanner.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ banners: docs.map((d) => format(d)) });
  } catch (error) {
    console.error('GET /admin/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const err = validate(payload);
    if (err) return res.status(400).json({ message: err });
    const doc = await HomeBanner.create(payload);
    res.status(201).json({ banner: format(doc.toObject()) });
  } catch (error) {
    console.error('POST /admin/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const doc = await HomeBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Banner-i nuk u gjet.' });
    const payload = normalizePayload({ ...doc.toObject(), ...req.body });
    const err = validate(payload);
    if (err) return res.status(400).json({ message: err });
    doc.title = payload.title;
    doc.subtitle = payload.subtitle;
    doc.imageUrl = payload.imageUrl;
    doc.ctaLabel = payload.ctaLabel;
    doc.ctaHref = payload.ctaHref;
    doc.order = payload.order;
    doc.isActive = payload.isActive;
    await doc.save();
    res.json({ banner: format(doc.toObject()) });
  } catch (error) {
    console.error('PATCH /admin/home-banners/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await HomeBanner.findByIdAndDelete(req.params.id).lean();
    if (!deleted) return res.status(404).json({ message: 'Banner-i nuk u gjet.' });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /admin/home-banners/:id:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
