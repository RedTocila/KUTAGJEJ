'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getPostingQuotaSnapshot } = require('../lib/listing-category-quota');

const router = express.Router();

/** GET /api/listings/category-quota — remaining slots per listing category. */
router.get('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const snapshot = await getPostingQuotaSnapshot(req.user.id);
    res.json(snapshot);
  } catch (err) {
    console.error('GET /listings/category-quota:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
