'use strict';

const express = require('express');
const optionalAuth = require('../middleware/optional-auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { validateReservationPayload } = require('../lib/directory-business-validation');

const router = express.Router();

/** POST /api/business-reservations */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const v = validateReservationPayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const sb = getSupabaseAdmin();
    const { data: listing, error: listingErr } = await sb
      .from('directory_listings')
      .select(
        'id, poster_id, title, reservations_enabled',
      )
      .eq('id', v.listingId)
      .eq('vertical', 'businesses')
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    if (!listing.reservations_enabled) {
      return res.status(400).json({ message: 'Ky biznes nuk pranon rezervime në platformë.' });
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
    const model = req.user?.constructor?.modelName;
    if (model === 'IndividualUser' || model === 'BusinessUser') {
      userId = req.user.id || req.user._id;
    }

    const { data: doc, error } = await sb
      .from('business_reservations')
      .insert({
        listing_id: v.listingId,
        guest_name: v.guestName,
        guest_phone: v.guestPhone,
        party_size: v.partySize,
        reservation_date: v.reservationDate,
        time_slot: v.timeSlot,
        user_id: userId,
      })
      .select('*')
      .single();
    if (error) throw error;

    if (listing.poster_id) {
      try {
        const { notifyBusinessReservation } = require('../lib/user-notifications');
        await notifyBusinessReservation({
          posterId: listing.poster_id,
          listingId: listing.id,
          listingTitle: listing.title || '',
          guestName: v.guestName,
          reservationDate: v.reservationDate,
          timeSlot: v.timeSlot,
        });
      } catch (notifyErr) {
        console.warn('notifyBusinessReservation:', notifyErr?.message || notifyErr);
      }
    }

    res.status(201).json({
      reservation: {
        id: String(doc.id),
        reservationDate: doc.reservation_date,
        timeSlot: doc.time_slot,
        partySize: doc.party_size,
        status: doc.status,
      },
    });
  } catch (err) {
    console.error('POST /business-reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
