'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow, camelizeRows } = require('../../lib/profiles');
const { validateBusinessPayload, BUSINESS_CATEGORIES } = require('../../lib/directory-business-validation');
const { attachOwnerMetrics } = require('../../lib/listing-metrics');
const { buildCityIndexFromDocs } = require('../../lib/directory-listings/city-index');
const { formatMineBusiness } = require('../../lib/directory-listings/format-mine');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');
const { isUuid } = require('../../lib/public-listings/query-helpers');

const router = express.Router();

/** GET /api/listings/directory/businesses/mine */
router.get('/businesses/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('directory_listings')
      .select('*')
      .eq('poster_id', req.user.id)
      .eq('vertical', 'businesses')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const docs = camelizeRows(data);
    const cityById = await buildCityIndexFromDocs(docs);
    const listings = docs.map((d) => formatMineBusiness(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'businesses') });
  } catch (err) {
    console.error('GET /listings/directory/businesses/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/directory/businesses */
router.post('/businesses', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const body = req.body;
    const v = validateBusinessPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(body.cityId).trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const imageUrls = v.imageUrls ?? [];

    const row = {
      vertical: 'businesses',
      poster_id: req.user.id,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: imageUrls,
      opening_hours: v.openingHours,
      weekly_hours: v.weeklyHours,
      menu_categories: v.menuCategories,
      menu_items: v.menuItems,
      reservations_enabled: v.reservationsEnabled,
      reservation_url: v.reservationUrl,
      reservation_time_slots: v.reservationTimeSlots,
      reservation_party_sizes: v.reservationPartySizes,
      services_highlight: v.servicesHighlight,
    };

    const { data: created, error: insErr } = await getSupabaseAdmin()
      .from('directory_listings')
      .insert(row)
      .select('*')
      .single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('businesses', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u dërgua për aprovim..',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
    });
  } catch (err) {
    console.error('POST /listings/directory/businesses:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/listings/directory/businesses/:id */
router.put('/businesses/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const { data: existing, error: selErr } = await getSupabaseAdmin()
      .from('directory_listings')
      .select('*')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .eq('vertical', 'businesses')
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validateBusinessPayload(body, { partial: true });
    if (!v.ok) return res.status(400).json({ message: v.message });

    const patch = { updated_at: new Date().toISOString() };

    if (body.title != null) patch.title = String(body.title).trim();
    if (body.description != null) patch.description = String(body.description).trim();
    if (body.category != null) {
      if (!BUSINESS_CATEGORIES.has(body.category)) {
        return res.status(400).json({ message: 'Kategoria nuk është e vlefshme.' });
      }
      patch.category = body.category;
    }
    if (body.cityId != null) {
      const cityId = String(body.cityId).trim();
      if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      const { data: city, error: cityErr } = await getSupabaseAdmin()
        .from('real_estate_cities')
        .select('id')
        .eq('id', cityId)
        .maybeSingle();
      if (cityErr) throw cityErr;
      if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      patch.city_id = cityId;
    }
    if (body.contactPhone != null) patch.contact_phone = String(body.contactPhone).trim();

    patch.opening_hours = v.openingHours;
    patch.weekly_hours = v.weeklyHours;
    patch.menu_categories = v.menuCategories;
    patch.menu_items = v.menuItems;
    patch.reservations_enabled = v.reservationsEnabled;
    patch.reservation_url = v.reservationUrl;
    patch.reservation_time_slots = v.reservationTimeSlots;
    patch.reservation_party_sizes = v.reservationPartySizes;
    patch.services_highlight = v.servicesHighlight;
    if (v.imageUrls != null) patch.image_urls = v.imageUrls;

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('directory_listings')
      .update(patch)
      .eq('id', rawId)
      .select('*')
      .single();
    if (updErr) throw updErr;

    const doc = camelizeRow(updated);
    res.json({ listing: { id: String(doc.id), title: doc.title, updatedAt: doc.updatedAt } });
  } catch (err) {
    console.error('PUT /listings/directory/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
