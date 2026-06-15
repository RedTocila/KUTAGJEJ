const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const DirectoryListing = require('../../models/DirectoryListing');
const BusinessReservation = require('../../models/BusinessReservation');

const router = express.Router();

/** GET /api/listings/directory/businesses/:id/reservations */
router.get('/businesses/:id/reservations', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const posterModel = req.user.constructor.modelName;
    const listing = await DirectoryListing.findOne({
      _id: rawId,
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    }).lean();
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const status = String(req.query.status || 'all').trim();
    const filter = { listingId: listing._id };
    if (status === 'pending') filter.status = 'pending';

    const rows = await BusinessReservation.find(filter).sort({ createdAt: -1 }).limit(200).lean();

    res.json({
      reservations: rows.map((r) => ({
        id: String(r._id),
        guestName: r.guestName,
        guestPhone: r.guestPhone,
        partySize: r.partySize,
        reservationDate: r.reservationDate,
        timeSlot: r.timeSlot,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error('GET /listings/directory/businesses/:id/reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/listings/directory/businesses/reservations/:reservationId */
router.patch('/businesses/reservations/:reservationId', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.reservationId ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });
    }

    const row = await BusinessReservation.findById(rawId);
    if (!row) return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });

    const posterModel = req.user.constructor.modelName;
    const listing = await DirectoryListing.findOne({
      _id: row.listingId,
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    });
    if (!listing) return res.status(403).json({ message: 'Nuk keni akses.' });

    const status = String(req.body?.status || '').trim();
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Statusi nuk është i vlefshëm.' });
    }
    row.status = status;
    await row.save();

    res.json({
      reservation: {
        id: String(row._id),
        status: row.status,
      },
    });
  } catch (err) {
    console.error('PATCH reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
