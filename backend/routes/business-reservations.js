const express = require('express');
const mongoose = require('mongoose');
const optionalAuth = require('../middleware/optional-auth');
const DirectoryListing = require('../models/DirectoryListing');
const BusinessReservation = require('../models/BusinessReservation');
const { validateReservationPayload } = require('../lib/directory-business-validation');

const router = express.Router();

/** POST /api/business-reservations */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const v = validateReservationPayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const listing = await DirectoryListing.findOne({
      _id: v.listingId,
      vertical: 'businesses',
    }).lean();
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    if (!listing.reservationsEnabled) {
      return res.status(400).json({ message: 'Ky biznes nuk pranon rezervime në platformë.' });
    }

    const slots = listing.reservationTimeSlots ?? [];
    if (slots.length > 0 && !slots.includes(v.timeSlot)) {
      return res.status(400).json({ message: 'Ora e zgjedhur nuk është e disponueshme.' });
    }

    const sizes = listing.reservationPartySizes ?? [];
    if (sizes.length > 0 && !sizes.includes(v.partySize)) {
      return res.status(400).json({ message: 'Numri i mysafirëve nuk është i lejuar.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(`${v.reservationDate}T12:00:00`);
    if (Number.isNaN(chosen.getTime())) {
      return res.status(400).json({ message: 'Data nuk është e vlefshme.' });
    }
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 14);
    if (chosen < today || chosen > maxDate) {
      return res.status(400).json({ message: 'Data duhet të jetë brenda 14 ditëve të ardhshme.' });
    }

    let userId = null;
    let userModel = null;
    const model = req.user?.constructor?.modelName;
    if (model === 'IndividualUser' || model === 'BusinessUser') {
      userId = req.user._id;
      userModel = model;
    }

    const doc = await BusinessReservation.create({
      listingId: v.listingId,
      guestName: v.guestName,
      guestPhone: v.guestPhone,
      partySize: v.partySize,
      reservationDate: v.reservationDate,
      timeSlot: v.timeSlot,
      userId,
      userModel,
    });

    res.status(201).json({
      reservation: {
        id: String(doc._id),
        reservationDate: doc.reservationDate,
        timeSlot: doc.timeSlot,
        partySize: doc.partySize,
        status: doc.status,
      },
    });
  } catch (err) {
    console.error('POST /business-reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
