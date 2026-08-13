'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { parseGoogleMapsLocation } = require('../lib/google-maps-location');

const router = express.Router();

/** POST /api/listings/resolve-maps-url — expand short links, coords, street label. */
router.post('/resolve-maps-url', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const parsed = await parseGoogleMapsLocation(req.body?.mapsUrl);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });
    res.json({
      mapsUrl: parsed.mapsUrl,
      locationLat: parsed.locationLat,
      locationLng: parsed.locationLng,
      placeQuery: parsed.placeQuery,
      locationAddress: parsed.locationAddress,
    });
  } catch (err) {
    console.error('POST /listings/resolve-maps-url:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
