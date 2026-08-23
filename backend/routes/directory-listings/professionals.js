'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow } = require('../../lib/profiles');
const { validateProfessionalPayload } = require('../../lib/directory-professional-validation');
const { hasUnlimitedDirectoryListings } = require('../../lib/directory-listing-limits');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');
const { isUuid } = require('../../lib/public-listings/query-helpers');
const { resolveOptionalCityId } = require('../../lib/listing-city');
const { requireListingPhotos } = require('../../lib/image-upload');
const { formatMineProfessional, formatMineProfessionalFull, loadMineKind, loadMineListingById } = require('../../lib/mine-listings');
const {
  parseMapsFieldsFromBody,
  mapsColumnsFromParsed,
  mapsJsonFromDoc,
} = require('../../lib/listing-maps-fields');

const router = express.Router();

/** GET /api/listings/directory/professionals/mine */
router.get('/professionals/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'directory_listings',
      metricKind: 'professionals',
      format: formatMineProfessional,
      extraEq: { vertical: 'professionals' },
    });
    res.json({ listings });
  } catch (err) {
    console.error('GET /listings/directory/professionals/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listings/directory/professionals/mine/:id */
router.get('/professionals/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'directory_listings',
      listingId: req.params.id,
      metricKind: 'professionals',
      format: formatMineProfessionalFull,
      extraEq: { vertical: 'professionals' },
    });
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ listing });
  } catch (err) {
    console.error('GET /listings/directory/professionals/mine/:id:', err?.message || err);
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
    if (!hasUnlimitedDirectoryListings(req.user)) {
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
    }

    const city = await resolveOptionalCityId(body.cityId);
    if (!city.ok) return res.status(400).json({ message: city.message });
    const cityId = city.cityId;

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const imageUrls = v.imageUrls ?? [];
    const photos = requireListingPhotos(imageUrls);
    if (!photos.ok) return res.status(400).json({ message: photos.message });

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
      status: 'approved',
      ...mapsColumnsFromParsed(maps),
    };
    if (v.currency != null) row.currency = v.currency;

    const { data: created, error: insErr } = await sb.from('directory_listings').insert(row).select('*').single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('professionals', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u publikua me sukses.',
      listing: {
        id: String(doc.id),
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        ...mapsJsonFromDoc(doc),
      },
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
      const category = String(body.category).trim();
      if (category.length > 80) {
        return res.status(400).json({ message: 'Kategoria nuk është e vlefshme.' });
      }
      patch.category = category || null;
    }
    if (body.cityId != null) {
      const city = await resolveOptionalCityId(body.cityId);
      if (!city.ok) return res.status(400).json({ message: city.message });
      patch.city_id = city.cityId;
    }
    if (body.contactPhone != null) patch.contact_phone = String(body.contactPhone).trim();

    const maps = await parseMapsFieldsFromBody(body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });
    if (!maps.skip) Object.assign(patch, mapsColumnsFromParsed(maps));

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
    res.json({
      listing: {
        id: String(doc.id),
        title: doc.title,
        updatedAt: doc.updatedAt,
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (err) {
    console.error('PUT /listings/directory/professionals/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
