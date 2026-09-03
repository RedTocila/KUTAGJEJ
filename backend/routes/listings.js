'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const {
  validateRealEstatePayload,
  needsCondition,
  needsFloor,
  needsTotalFloors,
  needsParkingFloor,
  needsBedroomsBathFurnishing,
  needsYearBuilt,
} = require('../lib/real-estate-field-rules');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls, requireListingPhotos } = require('../lib/image-upload');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { parseComparePrice } = require('../lib/listing-compare-price');
const { slugifyTitle } = require('../lib/real-estate-permalink');
const {
  formatMineRealEstate,
  formatMineRealEstateFull,
  loadMineKind,
  loadMineListingById,
  loadMineListingsForPoster,
} = require('../lib/mine-listings');
const {
  assertCanCreateCategoryListing,
  recordCategoryListingSlotUse,
} = require('../lib/listing-category-quota');
const {
  parseMapsFieldsFromBody,
  mapsColumnsFromParsed,
  mapsJsonFromDoc,
} = require('../lib/listing-maps-fields');

const router = express.Router();

const MAX_REAL_ESTATE_IMAGES = 8;

function filled(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

/** Optional category-detail columns — null when blank / not applicable. */
function realEstateCategoryFields(propertyCategory, body) {
  return {
    condition: needsCondition(propertyCategory) && filled(body.condition) ? body.condition : null,
    floor: needsFloor(propertyCategory) && filled(body.floor) ? Number(body.floor) : null,
    total_floors: needsTotalFloors(propertyCategory) && filled(body.totalFloors) ? Number(body.totalFloors) : null,
    parking_floor: needsParkingFloor(propertyCategory) && filled(body.parkingFloor) ? Number(body.parkingFloor) : null,
    bedrooms: needsBedroomsBathFurnishing(propertyCategory) && filled(body.bedrooms) ? Number(body.bedrooms) : null,
    bathrooms: needsBedroomsBathFurnishing(propertyCategory) && filled(body.bathrooms) ? Number(body.bathrooms) : null,
    furnishing: needsBedroomsBathFurnishing(propertyCategory) && filled(body.furnishing) ? body.furnishing : null,
    year_built: needsYearBuilt(propertyCategory) && filled(body.yearBuilt) ? Number(body.yearBuilt) : null,
  };
}

async function resolveCityAndOptionalZone(cityIdRaw, zoneIdRaw) {
  const cityId = String(cityIdRaw ?? '').trim();
  const zoneId = String(zoneIdRaw ?? '').trim();
  if (!cityId) {
    if (zoneId) return { ok: false, message: 'Zgjidhni qytetin para se të zgjidhni zonën.' };
    return { ok: true, cityId: null, zoneId: null };
  }
  if (!isUuid(cityId)) return { ok: false, message: 'Invalid city id.' };

  const { data: cityRow, error: cityErr } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('*')
    .eq('id', cityId)
    .maybeSingle();
  if (cityErr) throw cityErr;
  if (!cityRow) return { ok: false, message: 'City not found.' };

  const city = camelizeRow(cityRow);
  if (!zoneId) return { ok: true, cityId, zoneId: null };

  if (!isUuid(zoneId)) return { ok: false, message: 'Invalid zone id.' };
  const zone = (city.zones || []).find((z) => String(z.id) === zoneId);
  if (!zone) return { ok: false, message: 'Zone does not belong to the selected city.' };
  return { ok: true, cityId, zoneId };
}

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'This action is only available for individual or business accounts.' });
  }
  next();
}

router.get('/', authMiddleware, async (_req, res) => {
  try {
    res.json({ listings: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** Aggregated slim mine payload for the dashboard (all verticals, one round-trip). */
router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const payload = await loadMineListingsForPoster(req.user.id);
    res.json(payload);
  } catch (error) {
    console.error('GET /listings/mine:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** Portal user: their real-estate listings (newest first, card fields only). */
router.get('/real-estate/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'real_estate_listings',
      metricKind: 'real-estate',
      format: formatMineRealEstate,
    });
    res.json({ listings });
  } catch (error) {
    console.error('GET /listings/real-estate/mine:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** Full listing for owner edit. */
router.get('/real-estate/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'Invalid listing id.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'real_estate_listings',
      listingId: req.params.id,
      metricKind: 'real-estate',
      format: formatMineRealEstateFull,
    });
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    res.json({ listing });
  } catch (error) {
    console.error('GET /listings/real-estate/mine/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/real-estate', authMiddleware, requirePortalUser, async (req, res) => {
  let reservedSlot = false;
  try {
    const quota = await assertCanCreateCategoryListing(req.user.id, 'apartment');
    if (!quota.ok) return res.status(quota.status || 403).json({ message: quota.message });

    const v = validateRealEstatePayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const loc = await resolveCityAndOptionalZone(req.body.cityId, req.body.zoneId);
    if (!loc.ok) return res.status(400).json({ message: loc.message });

    const maps = await parseMapsFieldsFromBody(req.body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const propertyCategory = req.body.propertyCategory || null;
    const contactPhone = String(req.body.contactPhone ?? '').trim();
    const imageUrls = sanitizeImageUrls(req.body.imageUrls, MAX_REAL_ESTATE_IMAGES);
    const photos = requireListingPhotos(imageUrls);
    if (!photos.ok) return res.status(400).json({ message: photos.message });

    const price = Number(req.body.price);
    const cmp = parseComparePrice(req.body.originalPrice, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const reserved = await recordCategoryListingSlotUse(req.user.id, 'apartment');
    if (!reserved.ok) return res.status(reserved.status || 403).json({ message: reserved.message });
    reservedSlot = !reserved.skipped;

    const row = {
      poster_id: req.user.id,
      property_category: propertyCategory,
      title: String(req.body.title).trim(),
      permalink_slug: slugifyTitle(req.body.title),
      description: String(req.body.description || '').trim(),
      transaction_type: req.body.transactionType || null,
      price,
      original_price: cmp.value,
      currency: req.body.currency,
      surface_m2: req.body.surfaceM2,
      city_id: loc.cityId,
      zone_id: loc.zoneId,
      contact_phone: contactPhone,
      ...realEstateCategoryFields(propertyCategory, req.body),
      image_urls: imageUrls,
      status: 'approved',
      ...mapsColumnsFromParsed(maps),
    };

    const { data: created, error: insErr } = await getSupabaseAdmin()
      .from('real_estate_listings')
      .insert(row)
      .select('*')
      .single();
    if (insErr) throw insErr;

    const doc = camelizeRow(created);
    await notifyAdminsListingSubmitted('real-estate', doc.id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u publikua me sukses.',
      listing: {
        id: String(doc.id),
        propertyCategory: doc.propertyCategory,
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (error) {
    if (reservedSlot) {
      const { refundSubscriptionSlot } = require('../lib/listing-quota-convert');
      await refundSubscriptionSlot(req.user.id, 'apartment').catch(() => {});
    }
    console.error('POST /listings/real-estate:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/listings/real-estate/:id — owner update. */
router.put('/real-estate/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const { data: existing, error: selErr } = await getSupabaseAdmin()
      .from('real_estate_listings')
      .select('id, poster_id')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const v = validateRealEstatePayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const loc = await resolveCityAndOptionalZone(req.body.cityId, req.body.zoneId);
    if (!loc.ok) return res.status(400).json({ message: loc.message });

    const maps = await parseMapsFieldsFromBody(req.body);
    if (!maps.ok) return res.status(400).json({ message: maps.message });

    const propertyCategory = req.body.propertyCategory || null;
    const contactPhone = String(req.body.contactPhone ?? '').trim();
    const imageUrls = sanitizeImageUrls(req.body.imageUrls, MAX_REAL_ESTATE_IMAGES);
    const photos = requireListingPhotos(imageUrls);
    if (!photos.ok) return res.status(400).json({ message: photos.message });

    const price = Number(req.body.price);
    const cmp = parseComparePrice(req.body.originalPrice, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const patch = {
      property_category: propertyCategory,
      title: String(req.body.title).trim(),
      description: String(req.body.description || '').trim(),
      transaction_type: req.body.transactionType || null,
      price,
      original_price: cmp.value,
      currency: req.body.currency,
      surface_m2: req.body.surfaceM2,
      city_id: loc.cityId,
      zone_id: loc.zoneId,
      contact_phone: contactPhone,
      ...realEstateCategoryFields(propertyCategory, req.body),
      image_urls: imageUrls,
      updated_at: new Date().toISOString(),
    };
    if (!maps.skip) Object.assign(patch, mapsColumnsFromParsed(maps));

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('real_estate_listings')
      .update(patch)
      .eq('id', rawId)
      .select('*')
      .single();
    if (updErr) throw updErr;

    const doc = camelizeRow(updated);
    res.json({
      message: 'Njoftimi u përditësua.',
      listing: {
        id: String(doc.id),
        title: doc.title,
        status: doc.status,
        updatedAt: doc.updatedAt,
        ...mapsJsonFromDoc(doc),
      },
    });
  } catch (error) {
    console.error('PUT /listings/real-estate/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
