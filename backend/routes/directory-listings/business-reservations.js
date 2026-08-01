'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow, camelizeRows } = require('../../lib/profiles');
const { isUuid } = require('../../lib/public-listings/query-helpers');

const router = express.Router();

/** GET /api/listings/directory/businesses/:id/reservations */
router.get('/businesses/:id/reservations', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const { data: listing, error: listingErr } = await getSupabaseAdmin()
      .from('directory_listings')
      .select('id')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .eq('vertical', 'businesses')
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const status = String(req.query.status || 'all').trim();
    let q = getSupabaseAdmin()
      .from('business_reservations')
      .select('*')
      .eq('listing_id', listing.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (status === 'pending') q = q.eq('status', 'pending');

    const { data: rows, error } = await q;
    if (error) throw error;

    res.json({
      reservations: camelizeRows(rows).map((r) => ({
        id: String(r.id),
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
    if (!isUuid(rawId)) {
      return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });
    }

    const { data: row, error: rowErr } = await getSupabaseAdmin()
      .from('business_reservations')
      .select('*')
      .eq('id', rawId)
      .maybeSingle();
    if (rowErr) throw rowErr;
    if (!row) return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });

    const { data: listing, error: listingErr } = await getSupabaseAdmin()
      .from('directory_listings')
      .select('id')
      .eq('id', row.listing_id)
      .eq('poster_id', req.user.id)
      .eq('vertical', 'businesses')
      .maybeSingle();
    if (listingErr) throw listingErr;
    if (!listing) return res.status(403).json({ message: 'Nuk keni akses.' });

    const status = String(req.body?.status || '').trim();
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Statusi nuk është i vlefshëm.' });
    }

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('business_reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', rawId)
      .select('*')
      .single();
    if (updErr) throw updErr;

    const doc = camelizeRow(updated);
    res.json({
      reservation: {
        id: String(doc.id),
        status: doc.status,
      },
    });
  } catch (err) {
    console.error('PATCH reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
