const express = require('express');
const RealEstateCity = require('../models/RealEstateCity');

const router = express.Router();

function formatCity(doc) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    slug: o.slug,
    zones: (o.zones || []).map((z) => ({
      id: String(z._id),
      name: z.name,
      slug: z.slug,
    })),
  };
}

/** Public: cities and zones for the real-estate listing form. */
router.get('/', async (_req, res) => {
  try {
    const docs = await RealEstateCity.find().sort({ name: 1 }).lean();
    res.json({ cities: docs.map((d) => formatCity(d)) });
  } catch (error) {
    console.error('GET /real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
