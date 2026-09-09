'use strict';

const express = require('express');
const publicCache = require('../middleware/public-cache');
const { getHomepageBundle } = require('../lib/homepage-bundle');

const router = express.Router();

/**
 * GET /api/public/homepage?limit=8
 * Single public homepage payload for Next.js SSR (banners + listings + members).
 * No auth / no personalized fields — safe to CDN-cache.
 */
router.get('/', publicCache(300), async (req, res) => {
  try {
    const payload = await getHomepageBundle(req.query.limit);
    res.json(payload);
  } catch (err) {
    console.error('GET /public/homepage:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
