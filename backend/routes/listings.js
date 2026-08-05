'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow, camelizeRows } = require('../lib/profiles');
const { attachOwnerMetrics } = require('../lib/listing-metrics');
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
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isUuid, buildCityIndex } = require('../lib/public-listings/query-helpers');
const { premiumFieldsFromDoc } = require('../lib/premium-listing');
const { okazionFieldsFromDoc } = require('../lib/okazion-listing');

const router = express.Router();

const MAX_REAL_ESTATE_IMAGES = 8;

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

function formatMineListing(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: String(doc.id),
    title: doc.title,
    description: doc.description,
    propertyCategory: doc.propertyCategory,
    transactionType: doc.transactionType,
    price: doc.price,
    currency: doc.currency,
    surfaceM2: doc.surfaceM2,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    contactPhone: doc.contactPhone ?? null,
    condition: doc.condition ?? null,
    apartmentTypeSlug: doc.apartmentTypeSlug ?? null,
    floor: doc.floor ?? null,
    totalFloors: doc.totalFloors ?? null,
    parkingFloor: doc.parkingFloor ?? null,
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    furnishing: doc.furnishing ?? null,
    yearBuilt: doc.yearBuilt ?? null,
    imageUrls: doc.imageUrls ?? [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

/** Portal user: their saved real-estate listings (newest first). */
router.get('/real-estate/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('real_estate_listings')
      .select('*')
      .eq('poster_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const docs = camelizeRows(data);
    const cityById = await buildCityIndex(docs);
    const listings = docs.map((d) => formatMineListing(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'real-estate') });
  } catch (error) {
    console.error('GET /listings/real-estate/mine:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/real-estate', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const v = validateRealEstatePayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(req.body.cityId ?? '').trim();
    const zoneId = String(req.body.zoneId ?? '').trim();
    if (!isUuid(cityId) || !isUuid(zoneId)) {
      return res.status(400).json({ message: 'Invalid city or zone id.' });
    }

    const { data: cityRow, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('*')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!cityRow) return res.status(400).json({ message: 'City not found.' });

    const city = camelizeRow(cityRow);
    const zone = (city.zones || []).find((z) => String(z.id) === zoneId);
    if (!zone) return res.status(400).json({ message: 'Zone does not belong to the selected city.' });

    const propertyCategory = String(req.body.propertyCategory).trim().toLowerCase();
    const contactPhone = String(req.body.contactPhone ?? '').trim();

    const row = {
      poster_id: req.user.id,
      property_category: propertyCategory,
      title: String(req.body.title).trim(),
      description: String(req.body.description).trim(),
      transaction_type: req.body.transactionType,
      price: Number(req.body.price),
      currency: req.body.currency,
      surface_m2: Number(req.body.surfaceM2),
      city_id: cityId,
      zone_id: zoneId,
      contact_phone: contactPhone,
      condition: needsCondition(propertyCategory) ? req.body.condition : null,
      floor: needsFloor(propertyCategory) ? Number(req.body.floor) : null,
      total_floors: needsTotalFloors(propertyCategory) ? Number(req.body.totalFloors) : null,
      parking_floor: needsParkingFloor(propertyCategory) ? Number(req.body.parkingFloor) : null,
      bedrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bedrooms) : null,
      bathrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bathrooms) : null,
      furnishing: needsBedroomsBathFurnishing(propertyCategory) ? req.body.furnishing : null,
      year_built: needsYearBuilt(propertyCategory) ? Number(req.body.yearBuilt) : null,
      image_urls: sanitizeImageUrls(req.body.imageUrls, MAX_REAL_ESTATE_IMAGES),
      status: 'approved',
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
      },
    });
  } catch (error) {
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

    const cityId = String(req.body.cityId ?? '').trim();
    const zoneId = String(req.body.zoneId ?? '').trim();
    if (!isUuid(cityId) || !isUuid(zoneId)) {
      return res.status(400).json({ message: 'Invalid city or zone id.' });
    }

    const { data: cityRow, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('*')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!cityRow) return res.status(400).json({ message: 'City not found.' });

    const city = camelizeRow(cityRow);
    const zone = (city.zones || []).find((z) => String(z.id) === zoneId);
    if (!zone) return res.status(400).json({ message: 'Zone does not belong to the selected city.' });

    const propertyCategory = String(req.body.propertyCategory).trim().toLowerCase();
    const contactPhone = String(req.body.contactPhone ?? '').trim();

    const patch = {
      property_category: propertyCategory,
      title: String(req.body.title).trim(),
      description: String(req.body.description).trim(),
      transaction_type: req.body.transactionType,
      price: Number(req.body.price),
      currency: req.body.currency,
      surface_m2: Number(req.body.surfaceM2),
      city_id: cityId,
      zone_id: zoneId,
      contact_phone: contactPhone,
      condition: needsCondition(propertyCategory) ? req.body.condition : null,
      floor: needsFloor(propertyCategory) ? Number(req.body.floor) : null,
      total_floors: needsTotalFloors(propertyCategory) ? Number(req.body.totalFloors) : null,
      parking_floor: needsParkingFloor(propertyCategory) ? Number(req.body.parkingFloor) : null,
      bedrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bedrooms) : null,
      bathrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bathrooms) : null,
      furnishing: needsBedroomsBathFurnishing(propertyCategory) ? req.body.furnishing : null,
      year_built: needsYearBuilt(propertyCategory) ? Number(req.body.yearBuilt) : null,
      image_urls: sanitizeImageUrls(req.body.imageUrls, MAX_REAL_ESTATE_IMAGES),
      updated_at: new Date().toISOString(),
    };

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
      },
    });
  } catch (error) {
    console.error('PUT /listings/real-estate/:id:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
