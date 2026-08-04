'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow, camelizeRows } = require('../../lib/profiles');
const {
  validateProfessionalPayload,
  PROFESSIONAL_CATEGORIES,
} = require('../../lib/directory-professional-validation');
const { attachOwnerMetrics } = require('../../lib/listing-metrics');
const { buildCityIndexFromDocs } = require('../../lib/directory-listings/city-index');
const { formatMineProfessional } = require('../../lib/directory-listings/format-mine');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');
const { isUuid } = require('../../lib/public-listings/query-helpers');

const router = express.Router();

/** GET /api/listings/directory/professionals/mine */
router.get('/professionals/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('directory_listings')
      .select('*')
      .eq('poster_id', req.user.id)
      .eq('vertical', 'professionals')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const docs = camelizeRows(data);
    const cityById = await buildCityIndexFromDocs(docs);
    const listings = docs.map((d) => formatMineProfessional(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'professionals') });
  } catch (err) {
    console.error('GET /listings/directory/professionals/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/directory/professionals */
router.post('/professionals', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const body = req.body;
    const v = validateProfessionalPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const sb = getSupabaseAdmin();
    const { count: existingCount, error: countErr } = await sb
      .from('directory_listings')
      .select('id', { count: 'exact', head: true })
      .eq('poster_id', req.user.id)
      .eq('vertical', 'professionals');
    if (countErr) throw countErr;
    if ((existingCount ?? 0) > 0) {
      return res.status(409).json({
        message: 'Mund të keni vetëm një profil profesionisti. Përditësojeni atë ekzistues nga Shpalljet e mia.',
      });
    }

    const cityId = String(body.cityId).trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const { data: city, error: cityErr } = await sb
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const imageUrls = v.imageUrls ?? [];

    const row = {
      vertical: 'professionals',
      poster_id: req.user.id,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      city_id: cityId,
      contact_phone: String(body.contactPhone || '').trim(),
      image_urls: imageUrls,
      condition: v.condition,
      price: v.price,
      response_time_hours: v.responseTimeHours,
      portfolio_items: v.portfolioItems,
      services_highlight: v.servicesHighlight,
    };
    if (v.currency != null) row.currency = v.currency;

    const { data: created, error: insErr } = await sb.from('directory_listings').insert(row).select('*').single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('professionals', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u dërgua për aprovim..',
      listing: { id: String(doc.id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
    });
  } catch (err) {
    console.error('POST /listings/directory/professionals:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/listings/directory/professionals/:id */
router.put('/professionals/:id', authMiddleware, requirePortalUser, async (req, res) => {
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
      .eq('vertical', 'professionals')
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validateProfessionalPayload(body, { partial: true });
    if (!v.ok) return res.status(400).json({ message: v.message });

    const patch = { updated_at: new Date().toISOString() };

    if (body.title != null) patch.title = String(body.title).trim();
    if (body.description != null) patch.description = String(body.description).trim();
    if (body.category != null) {
      if (!PROFESSIONAL_CATEGORIES.has(body.category)) {
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

    patch.response_time_hours = v.responseTimeHours;
    patch.portfolio_items = v.portfolioItems;
    patch.price = v.price;
    patch.condition = v.condition;
    patch.services_highlight = v.servicesHighlight;
    if (v.currency != null) patch.currency = v.currency;
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
    console.error('PUT /listings/directory/professionals/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
