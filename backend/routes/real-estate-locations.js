'use strict';

const express = require('express');
const publicCache = require('../middleware/public-cache');
const { getPublicCitiesPayload } = require('../lib/real-estate-cities-public');

const router = express.Router();

/** Public: cities and zones for browse filters, SEO landings, and listing forms. */
router.get('/', publicCache(600), async (_req, res) => {
  try {
    const payload = await getPublicCitiesPayload();
    res.json(payload);
  } catch (error) {
    console.error('GET /real-estate/locations:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
