'use strict';

const express = require('express');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../../lib/supabase');
const { camelizeRow } = require('../../lib/profiles');
const { validateBusinessPayload } = require('../../lib/directory-business-validation');
const { resolveBusinessLocationFields } = require('../../lib/business-location-fields');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');
const { isUuid } = require('../../lib/public-listings/query-helpers');
const { formatMineBusiness, formatMineBusinessFull, loadMineKind, loadMineListingById } = require('../../lib/mine-listings');
const { parseGoogleMapsLocation } = require('../../lib/google-maps-location');

const router = express.Router();

/** POST /api/listings/directory/businesses/resolve-maps-url — expand short links + extract pin. */
router.post('/businesses/resolve-maps-url', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const parsed = await parseGoogleMapsLocation(req.body?.mapsUrl);
    if (!parsed.ok) return res.status(400).json({ message: parsed.message });
    res.json({
      mapsUrl: parsed.mapsUrl,
      locationLat: parsed.locationLat,
      locationLng: parsed.locationLng,
      placeQuery: parsed.placeQuery,
      locationAddress: parsed.locationAddress,
    });
  } catch (err) {
    console.error('POST /listings/directory/businesses/resolve-maps-url:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listings/directory/businesses/mine */
router.get('/businesses/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'directory_listings',
      metricKind: 'businesses',
      format: formatMineBusiness,
      extraEq: { vertical: 'businesses' },
    });
    res.json({ listings });
  } catch (err) {
    console.error('GET /listings/directory/businesses/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listings/directory/businesses/mine/:id */
router.get('/businesses/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'ID e pavlefshme.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'directory_listings',
      listingId: req.params.id,
      metricKind: 'businesses',
      format: formatMineBusinessFull,
      extraEq: { vertical: 'businesses' },
    });
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ listing });
  } catch (err) {
    console.error('GET /listings/directory/businesses/mine/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/directory/businesses */
router.post('/businesses', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (req.user?.constructor?.modelName !== 'BusinessUser') {
      return res.status(403).json({
        message: 'Krijoni një llogari biznesi për të kryer këtë veprim.',
      });
    }

    const body = req.body;
    const v = validateBusinessPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const sb = getSupabaseAdmin();
    const { count: existingCount, error: countErr } = await sb
      .from('directory_listings')
      .select('id', { count: 'exact', head: true })
      .eq('poster_id', req.user.id)
      .eq('vertical', 'businesses');
    if (countErr) throw countErr;
    if ((existingCount ?? 0) > 0) {
      return res.status(409).json({
        message: 'Mund të keni vetëm një profil biznesi. Përditësojeni atë ekzistues nga Shpalljet e mia.',
      });
    }

    const cityId = String(body.cityId).trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const { data: city, error: cityErr } = await sb
      .from('real_estate_cities')
      .select('id, zones')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const loc = await resolveBusinessLocationFields(
      {
        zoneId: v.zoneId ?? null,
        mapsUrlProvided: true,
        mapsUrlRaw: v.mapsUrlRaw ?? body.mapsUrl ?? '',
      },
      city,
    );
    if (!loc.ok) return res.status(400).json({ message: loc.message });

    const imageUrls = v.imageUrls ?? [];

    const row = {
      vertical: 'businesses',
      poster_id: req.user.id,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      city_id: cityId,
      zone_id: loc.zoneId ?? null,
      maps_url: loc.mapsUrl ?? null,
      location_lat: loc.locationLat ?? null,
      location_lng: loc.locationLng ?? null,
      location_address: loc.locationAddress ?? null,
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
      mobile_cta_mode: v.mobileCtaMode,
      services_highlight: v.servicesHighlight,
      status: 'approved',
    };

    const { data: created, error: insErr } = await sb.from('directory_listings').insert(row).select('*').single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('businesses', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u publikua me sukses.',
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
    if (req.user?.constructor?.modelName !== 'BusinessUser') {
      return res.status(403).json({
        message: 'Krijoni një llogari biznesi për të kryer këtë veprim.',
      });
    }

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
      const category = String(body.category).trim();
      if (!category || category.length > 80) {
        return res.status(400).json({ message: 'Kategoria nuk është e vlefshme.' });
      }
      patch.category = category;
    }

    const nextCityId =
      body.cityId != null ? String(body.cityId).trim() : existing.city_id ? String(existing.city_id) : null;

    let cityRow = null;
    if (body.cityId != null || body.zoneId !== undefined || body.mapsUrl !== undefined) {
      if (!nextCityId || !isUuid(nextCityId)) {
        return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      }
      const { data: city, error: cityErr } = await getSupabaseAdmin()
        .from('real_estate_cities')
        .select('id, zones')
        .eq('id', nextCityId)
        .maybeSingle();
      if (cityErr) throw cityErr;
      if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      cityRow = city;
      if (body.cityId != null) patch.city_id = nextCityId;
    }

    if (body.cityId != null || body.zoneId !== undefined || body.mapsUrl !== undefined) {
      const loc = await resolveBusinessLocationFields(
        {
          zoneId: body.zoneId !== undefined ? v.zoneId : undefined,
          mapsUrlProvided: body.mapsUrl !== undefined,
          mapsUrlRaw: v.mapsUrlRaw,
        },
        cityRow,
      );
      if (!loc.ok) return res.status(400).json({ message: loc.message });
      if (body.zoneId !== undefined) patch.zone_id = loc.zoneId;
      if (body.mapsUrl !== undefined) {
        patch.maps_url = loc.mapsUrl;
        patch.location_lat = loc.locationLat;
        patch.location_lng = loc.locationLng;
        patch.location_address = loc.locationAddress ?? null;
      }
      // City change without zone: clear zone if it no longer belongs (when zone not sent).
      if (body.cityId != null && body.zoneId === undefined && existing.zone_id && cityRow) {
        const zones = Array.isArray(cityRow.zones) ? cityRow.zones : [];
        const stillValid = zones.some((z) => String(z.id) === String(existing.zone_id));
        if (!stillValid) patch.zone_id = null;
      }
    }

    if (body.contactPhone != null) patch.contact_phone = String(body.contactPhone).trim();

    if (body.weeklyHours != null) {
      patch.opening_hours = v.openingHours;
      patch.weekly_hours = v.weeklyHours;
    }
    // Menu is edited on its own page — only overwrite when the body includes it.
    if (Array.isArray(body.menuCategories) || Array.isArray(body.menuItems)) {
      patch.menu_categories = v.menuCategories;
      patch.menu_items = v.menuItems;
    }
    if (
      body.reservationsEnabled != null ||
      body.reservationUrl != null ||
      body.reservationTimeSlots != null ||
      body.reservationPartySizes != null ||
      body.mobileCtaMode != null
    ) {
      if (v.reservationsEnabled != null) patch.reservations_enabled = v.reservationsEnabled;
      if (body.reservationUrl != null) patch.reservation_url = v.reservationUrl;
      if (body.reservationTimeSlots != null) patch.reservation_time_slots = v.reservationTimeSlots;
      if (body.reservationPartySizes != null) patch.reservation_party_sizes = v.reservationPartySizes;
      if (v.mobileCtaMode != null) patch.mobile_cta_mode = v.mobileCtaMode;
    }
    if (body.servicesHighlight != null) patch.services_highlight = v.servicesHighlight;
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
        cityId: doc.cityId ? String(doc.cityId) : null,
        zoneId: doc.zoneId ? String(doc.zoneId) : null,
        mapsUrl: doc.mapsUrl?.trim() || null,
        locationAddress: doc.locationAddress?.trim() || null,
        locationLat:
          typeof doc.locationLat === 'number'
            ? doc.locationLat
            : doc.locationLat != null
              ? Number(doc.locationLat)
              : null,
        locationLng:
          typeof doc.locationLng === 'number'
            ? doc.locationLng
            : doc.locationLng != null
              ? Number(doc.locationLng)
              : null,
      },
    });
  } catch (err) {
    console.error('PUT /listings/directory/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
