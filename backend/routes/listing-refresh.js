'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { refreshListingWithBoost } = require('../lib/listing-refresh');
const {
  getAutoRefreshSnapshot,
  setListingAutoRefresh,
} = require('../lib/listing-auto-refresh');

const router = express.Router();

router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const result = await refreshListingWithBoost({
      userId: req.user.id,
      kind,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      refreshedAt: result.refreshedAt,
      boostCredits: result.boostCredits,
      cost: result.cost,
      message: 'Njoftimi u rifreskua.',
    });
  } catch (err) {
    console.error('POST /listings/refresh:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/auto', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const snapshot = await getAutoRefreshSnapshot(req.user.id);
    res.json(snapshot);
  } catch (err) {
    console.error('GET /listings/refresh/auto:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/auto', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const kind = String(req.body?.kind || '').trim();
    const listingId = String(req.body?.listingId || '').trim();
    const enabled = Boolean(req.body?.enabled);
    const result = await setListingAutoRefresh({
      userId: req.user.id,
      kind,
      listingId,
      enabled,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      enabled: result.enabled,
      slots: result.slots,
      used: result.used,
      enrolled: result.enrolled,
      message: result.enabled
        ? 'Njoftimi u shtua në Auto-Refresh.'
        : 'Njoftimi u hoq nga Auto-Refresh.',
    });
  } catch (err) {
    console.error('POST /listings/refresh/auto:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
