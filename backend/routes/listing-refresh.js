'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { refreshListingWithBoost } = require('../lib/listing-refresh');
const {
  getAutoRefreshSnapshot,
  setListingAutoRefresh,
  processDueAutoRefreshes,
} = require('../lib/listing-auto-refresh');

const router = express.Router();
// Auto-Refresh is intentionally off until explicitly enabled in the deployment
// environment. Manual listing refresh remains available.
const AUTO_REFRESH_ENABLED = process.env.AUTO_REFRESH_ENABLED === 'true';

function authorizeCron(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const header = String(req.get('x-cron-secret') || '').trim();
  const bearer = String(req.get('authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  return header === secret || bearer === secret;
}

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
      message: 'Njoftimi u ngrijt në krye.',
    });
  } catch (err) {
    console.error('POST /listings/refresh:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/auto', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!AUTO_REFRESH_ENABLED) {
      const snapshot = await getAutoRefreshSnapshot(req.user.id);
      return res.json({
        enabled: false,
        slots: snapshot.slots,
        used: snapshot.used,
        enrolled: [],
        cooldowns: snapshot.cooldowns,
        planCode: snapshot.planCode,
        refreshEveryHours: snapshot.refreshEveryHours,
      });
    }
    // Opportunistic tick: Vercel serverless never runs the in-process scheduler.
    // Processing this user's due enrollments keeps Auto-Refresh alive while they browse.
    try {
      await processDueAutoRefreshes({ userId: req.user.id, limit: 50 });
    } catch (tickErr) {
      console.error('GET /listings/refresh/auto tick:', tickErr?.message || tickErr);
    }
    const snapshot = await getAutoRefreshSnapshot(req.user.id);
    res.json({ ...snapshot, enabled: AUTO_REFRESH_ENABLED });
  } catch (err) {
    console.error('GET /listings/refresh/auto:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/auto', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!AUTO_REFRESH_ENABLED) {
      return res.status(410).json({ message: 'Auto-Refresh është përkohësisht i çaktivizuar.' });
    }
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
      message: result.enabled ? 'Njoftimi u shtua në Auto-Refresh.' : 'Njoftimi u hoq nga Auto-Refresh.',
    });
  } catch (err) {
    console.error('POST /listings/refresh/auto:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** Internal/cron: process due Auto-Refresh enrollments (1 BC each). */
async function runAutoRefreshCron(req, res) {
  try {
    if (!authorizeCron(req)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!AUTO_REFRESH_ENABLED) {
      return res.json({ ok: true, disabled: true, scanned: 0, refreshed: 0, skipped: 0, failed: 0 });
    }
    const limit = Number(req.body?.limit || req.query?.limit) || undefined;
    const result = await processDueAutoRefreshes({ limit });
    res.json(result);
  } catch (err) {
    console.error('listings/refresh/auto/run:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Vercel Cron uses GET; keep POST for manual/ops triggers.
router.get('/auto/run', runAutoRefreshCron);
router.post('/auto/run', runAutoRefreshCron);

module.exports = router;
