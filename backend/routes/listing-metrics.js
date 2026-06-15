const express = require('express');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optional-auth');
const rateLimit = require('../middleware/rate-limit');
const {
  isValidKind,
  recordListingEvent,
  toggleSavedListing,
  fetchMetricsMap,
  saverFromUser,
} = require('../lib/listing-metrics');
const { getSavedKeysForSaver, listSavedListingsForSaver } = require('../lib/saved-listings-query');

const router = express.Router();
const metricsRateLimit = rateLimit({ windowMs: 60_000, max: 120 });

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Sign in with an individual or business account.' });
  }
  next();
}

/** POST /api/listing-metrics/event — view | click | share (anonymous or signed-in). */
router.post('/event', metricsRateLimit, optionalAuth, async (req, res) => {
  try {
    const kind = String(req.body?.listingKind ?? '').trim();
    const listingId = String(req.body?.listingId ?? '').trim();
    const event = String(req.body?.event ?? '').trim();
    const result = await recordListingEvent(req, { kind, listingId, event });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.metrics);
  } catch (err) {
    console.error('POST /listing-metrics/event:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listing-metrics/saved/keys — all bookmark keys for the signed-in portal user. */
router.get('/saved/keys', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const saver = saverFromUser(req.user);
    const keys = await getSavedKeysForSaver(saver);
    res.json({ keys });
  } catch (err) {
    console.error('GET /listing-metrics/saved/keys:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listing-metrics/saved?page=1&limit=24 — paginated saved listings with card payloads. */
router.get('/saved', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const saver = saverFromUser(req.user);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
    const result = await listSavedListingsForSaver(saver, { page, limit });
    res.json(result);
  } catch (err) {
    console.error('GET /listing-metrics/saved:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listing-metrics/save — toggle bookmark (auth required). */
router.post('/save', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const kind = String(req.body?.listingKind ?? '').trim();
    const listingId = String(req.body?.listingId ?? '').trim();
    const result = await toggleSavedListing(req, { kind, listingId });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json({ saved: result.saved, ...result.metrics });
  } catch (err) {
    console.error('POST /listing-metrics/save:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listing-metrics/batch?items=kind:id,kind:id */
router.get('/batch', metricsRateLimit, optionalAuth, async (req, res) => {
  try {
    const raw = String(req.query.items ?? '').trim();
    if (!raw) return res.json({ metrics: {} });
    const refs = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const colon = part.indexOf(':');
        if (colon <= 0) return null;
        const kind = part.slice(0, colon);
        const listingId = part.slice(colon + 1);
        if (!isValidKind(kind)) return null;
        return { kind, listingId };
      })
      .filter(Boolean);

    const { saverFromUser } = require('../lib/listing-metrics');
    const saver = saverFromUser(req.user);
    const map = await fetchMetricsMap(refs, saver);
    const metrics = Object.fromEntries(map.entries());
    res.json({ metrics });
  } catch (err) {
    console.error('GET /listing-metrics/batch:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
