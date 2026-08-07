'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const {
  deleteOwnerListing,
  deleteOwnerListings,
  isValidKind,
} = require('../lib/delete-owner-listing');

const router = express.Router();

/**
 * POST /api/listings/owner/bulk-delete — owner hard-delete many listings.
 * Body: { items: [{ kind, id }, ...] }
 */
router.post('/bulk-delete', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      return res.status(400).json({ message: 'Nuk u zgjodh asnjë njoftim.' });
    }
    if (rawItems.length > 100) {
      return res.status(400).json({ message: 'Mund të fshini deri në 100 njoftime njëherësh.' });
    }

    const result = await deleteOwnerListings({
      userId: req.user.id,
      items: rawItems,
    });

    if (result.deleted.length === 0 && result.failed.length > 0) {
      return res.status(400).json({
        message: result.failed[0]?.message || 'Njoftimet nuk u fshinë.',
        deleted: result.deleted,
        failed: result.failed,
      });
    }

    res.json({
      ok: true,
      deleted: result.deleted,
      failed: result.failed,
      message:
        result.failed.length > 0
          ? `U fshinë ${result.deleted.length} njoftime; ${result.failed.length} dështuan.`
          : result.deleted.length === 1
            ? 'Njoftimi u fshi.'
            : `U fshinë ${result.deleted.length} njoftime.`,
    });
  } catch (err) {
    console.error('POST /listings/owner/bulk-delete:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/listings/owner/:kind/:id — owner hard-delete one listing.
 */
router.delete('/:kind/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const kind = String(req.params.kind || '').trim();
    const id = String(req.params.id || '').trim();
    if (!isValidKind(kind)) {
      return res.status(400).json({ message: 'Kategoria e njoftimit nuk është e vlefshme.' });
    }

    const result = await deleteOwnerListing({
      userId: req.user.id,
      kind,
      listingId: id,
    });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    res.json({ ok: true, id: result.id, kind: result.kind, message: 'Njoftimi u fshi.' });
  } catch (err) {
    console.error('DELETE /listings/owner/:kind/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
