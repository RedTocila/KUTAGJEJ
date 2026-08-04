'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  getConvertibleQuotas,
  convertListingQuotas,
} = require('../lib/listing-quota-convert');

const router = express.Router();

router.get('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const snapshot = await getConvertibleQuotas(req.user.id);
    res.json(snapshot);
  } catch (err) {
    console.error('GET /listings/convert-quota:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const result = await convertListingQuotas(req.user.id, req.body || {});
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      creditsGranted: result.creditsGranted,
      boostCredits: result.boostCredits,
      converted: result.converted,
      available: result.available,
      max: result.max,
      used: result.used,
      rates: result.rates || undefined,
      message: `U konvertuan me sukses. +${result.creditsGranted} Boost Coins.`,
    });
  } catch (err) {
    console.error('POST /listings/convert-quota:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
