'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  ANNOUNCE_COST,
  upsertBusinessAnnouncement,
  clearBusinessAnnouncement,
} = require('../lib/listing-announcement');

const router = express.Router();

/** POST /api/listings/announcement — create or update a business announcement */
router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listingId = String(req.body?.listingId || '').trim();
    const reAnnounce = Boolean(req.body?.reAnnounce);
    const result = await upsertBusinessAnnouncement({
      userId: req.user.id,
      listingId,
      title: req.body?.title,
      subtitle: req.body?.subtitle,
      bannerUrl: req.body?.bannerUrl,
      reAnnounce,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({
      ok: true,
      charged: result.charged,
      cost: result.cost,
      boostCredits: result.boostCredits,
      refreshedAt: result.refreshedAt,
      announcement: result.announcement,
      message: result.charged
        ? `Shpallja u publikua · -${ANNOUNCE_COST} Boost Coins. Njoftimi është në krye të listës.`
        : 'Shpallja u përditësua.',
    });
  } catch (err) {
    console.error('POST /listings/announcement:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** DELETE /api/listings/announcement — remove announcement from a business listing */
router.delete('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listingId = String(req.body?.listingId || req.query?.listingId || '').trim();
    const result = await clearBusinessAnnouncement({
      userId: req.user.id,
      listingId,
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ ok: true, message: 'Shpallja u hoq.' });
  } catch (err) {
    console.error('DELETE /listings/announcement:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
