const express = require('express');
const ListingCategory = require('../models/ListingCategory');

const router = express.Router();

function format(doc) {
  return {
    key: doc.key,
    title: doc.title,
    slug: doc.slug,
    listingTypes: (doc.listingTypes || []).map((t) => ({ slug: t.slug, label: t.label })),
    updatedAt: doc.updatedAt,
  };
}

/** Public: listing forms can resolve category slug → types without admin token. */
router.get('/', async (_req, res) => {
  try {
    const docs = await ListingCategory.find().sort({ key: 1 }).lean();
    res.json({ categories: docs.map((d) => format(d)) });
  } catch (error) {
    console.error('GET /categories:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;
