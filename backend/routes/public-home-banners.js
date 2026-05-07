const express = require('express');
const HomeBanner = require('../models/HomeBanner');

const router = express.Router();

function format(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    subtitle: doc.subtitle || '',
    imageUrl: doc.imageUrl,
    ctaLabel: doc.ctaLabel || '',
    ctaHref: doc.ctaHref || '',
    order: Number(doc.order || 0),
  };
}

router.get('/', async (_req, res) => {
  try {
    const docs = await HomeBanner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json({ banners: docs.map((d) => format(d)) });
  } catch (error) {
    console.error('GET /public/home-banners:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
