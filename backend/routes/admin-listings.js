const express = require('express');
const authMiddleware = require('../middleware/auth');
const { listAdminListings, reviewListing } = require('../lib/listing-moderation');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

/** GET /api/admin/listings?status=pending&kind=real-estate&page=1&limit=24 */
router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const status = String(req.query.status ?? 'pending').trim();
    const kind = String(req.query.kind ?? '').trim() || undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
    const result = await listAdminListings({ status, kind, page, limit });
    res.json(result);
  } catch (err) {
    console.error('GET /admin/listings:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/listings/:kind/:id — approve or reject a pending listing. */
router.patch('/:kind/:id', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const decision = String(req.body.decision ?? '').trim();
    if (decision !== 'approve' && decision !== 'reject') {
      return res.status(400).json({ message: 'Vendimi duhet të jetë approve ose reject.' });
    }
    const result = await reviewListing(
      req.params.kind,
      req.params.id,
      req.admin,
      decision,
      req.body.adminNote,
    );
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json({ listing: result.listing });
  } catch (err) {
    console.error('PATCH /admin/listings/:kind/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
