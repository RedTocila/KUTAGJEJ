'use strict';

const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRow } = require('../lib/profiles');
const { validateCarPayload, FINISH_VALUES } = require('../lib/car-field-rules');
const { notifyAdminsListingSubmitted, listingTitle } = require('../lib/listing-moderation');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { uploadBuffersToSupabase } = require('../lib/storage-uploads');
const { parseComparePrice } = require('../lib/listing-compare-price');
const { formatMineCar, formatMineCarFull, loadMineKind, loadMineListingById } = require('../lib/mine-listings');
const { assertCanCreateCategoryListing } = require('../lib/listing-category-quota');


const router = express.Router();

const MAX_CAR_IMAGES = 8;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed.'));
    }
  },
});

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'This action is only available for individual or business accounts.' });
  }
  next();
}

function parseExtras(fields) {
  const raw = fields['extras[]'] || fields['extras'] || [];
  if (Array.isArray(raw)) return raw.map((e) => String(e).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function parseFinish(fields) {
  const raw = fields['finish'] || [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((f) => String(f).trim()).filter((f) => FINISH_VALUES.includes(f));
}

router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const listings = await loadMineKind(req.user.id, {
      table: 'car_listings',
      metricKind: 'car',
      format: formatMineCar,
    });
    res.json({ listings });
  } catch (err) {
    console.error('GET /listings/cars/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ message: 'Invalid listing id.' });
    const listing = await loadMineListingById(req.user.id, {
      table: 'car_listings',
      listingId: req.params.id,
      metricKind: 'car',
      format: formatMineCarFull,
    });
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });
    res.json({ listing });
  } catch (err) {
    console.error('GET /listings/cars/mine/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post(
  '/',
  authMiddleware,
  requirePortalUser,
  upload.array('images', MAX_CAR_IMAGES),
  async (req, res) => {
    try {
      const quota = await assertCanCreateCategoryListing(req.user.id, 'car');
      if (!quota.ok) return res.status(quota.status || 403).json({ message: quota.message });

      const fields = req.body;

      const v = validateCarPayload(fields);
      if (!v.ok) return res.status(400).json({ message: v.message });

      const files = req.files || [];
      const uploadedUrls = files.length
        ? await uploadBuffersToSupabase(files, 'cars')
        : [];
      // AI / form drafts may already have mirrored public URLs in imageUrls.
      const providedUrls = sanitizeImageUrls(fields.imageUrls, MAX_CAR_IMAGES);
      const imageUrls = [...providedUrls, ...uploadedUrls]
        .filter(Boolean)
        .filter((url, idx, arr) => arr.indexOf(url) === idx)
        .slice(0, MAX_CAR_IMAGES);

      const cityId = String(fields.cityId).trim();
      if (!isUuid(cityId)) return res.status(400).json({ message: 'City not found.' });

      const { data: city, error: cityErr } = await getSupabaseAdmin()
        .from('real_estate_cities')
        .select('id')
        .eq('id', cityId)
        .maybeSingle();
      if (cityErr) throw cityErr;
      if (!city) return res.status(400).json({ message: 'City not found.' });

      const price = Number(fields.price);
      const cmp = parseComparePrice(fields.originalPrice, price);
      if (!cmp.ok) return res.status(400).json({ message: cmp.message });

      const row = {
        poster_id: req.user.id,
        vehicle_type: String(fields.vehicleType).trim().toLowerCase(),
        make: String(fields.make).trim(),
        model: String(fields.model).trim(),
        variant: String(fields.variant || '').trim(),
        description: String(fields.description).trim(),
        year: Number(fields.year),
        kilometers: Number(fields.kilometers),
        transmission: fields.transmission,
        fuel_type: fields.fuelType,
        price,
        original_price: cmp.value,
        currency: fields.currency,
        color: String(fields.color).trim().toLowerCase(),
        finish: parseFinish(fields),
        extras: parseExtras(fields),
        contact_phone: String(fields.contactPhone || '').trim(),
        city_id: cityId,
        image_urls: imageUrls,
        status: 'approved',
      };

      const { data: created, error: insErr } = await getSupabaseAdmin()
        .from('car_listings')
        .insert(row)
        .select('*')
        .single();
      if (insErr) throw insErr;

      const doc = camelizeRow(created);
      await notifyAdminsListingSubmitted('cars', doc.id, listingTitle('cars', doc));

      res.status(201).json({
        message: 'Njoftimi u publikua me sukses.',
        listing: {
          id: String(doc.id),
          make: doc.make,
          model: doc.model,
          variant: doc.variant,
          year: doc.year,
          status: doc.status,
          createdAt: doc.createdAt,
        },
      });
    } catch (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Each image must be under 8 MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'You can upload at most 5 images.' });
      }
      console.error('POST /listings/cars:', err?.message || err);
      res.status(500).json({ message: 'Server error' });
    }
  },
);

/** PUT /api/listings/cars/:id — owner update (JSON; keep/replace imageUrls). */
router.put('/:id', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!isUuid(rawId)) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const { data: existing, error: selErr } = await getSupabaseAdmin()
      .from('car_listings')
      .select('id, poster_id')
      .eq('id', rawId)
      .eq('poster_id', req.user.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!existing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const fields = req.body || {};
    const v = validateCarPayload(fields);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = String(fields.cityId || '').trim();
    if (!isUuid(cityId)) return res.status(400).json({ message: 'City not found.' });

    const { data: city, error: cityErr } = await getSupabaseAdmin()
      .from('real_estate_cities')
      .select('id')
      .eq('id', cityId)
      .maybeSingle();
    if (cityErr) throw cityErr;
    if (!city) return res.status(400).json({ message: 'City not found.' });

    const finishRaw = fields.finish;
    const finish = Array.isArray(finishRaw)
      ? finishRaw.map((f) => String(f).trim()).filter((f) => FINISH_VALUES.includes(f))
      : parseFinish(fields);
    const extrasRaw = fields.extras;
    const extras = Array.isArray(extrasRaw)
      ? extrasRaw.map((e) => String(e).trim()).filter(Boolean)
      : parseExtras(fields);

    const price = Number(fields.price);
    const cmp = parseComparePrice(fields.originalPrice, price);
    if (!cmp.ok) return res.status(400).json({ message: cmp.message });

    const patch = {
      vehicle_type: String(fields.vehicleType).trim().toLowerCase(),
      make: String(fields.make).trim(),
      model: String(fields.model).trim(),
      variant: String(fields.variant || '').trim(),
      description: String(fields.description).trim(),
      year: Number(fields.year),
      kilometers: Number(fields.kilometers),
      transmission: fields.transmission,
      fuel_type: fields.fuelType,
      price,
      original_price: cmp.value,
      currency: fields.currency,
      color: String(fields.color).trim().toLowerCase(),
      finish,
      extras,
      contact_phone: String(fields.contactPhone || '').trim(),
      city_id: cityId,
      image_urls: sanitizeImageUrls(fields.imageUrls, MAX_CAR_IMAGES),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updErr } = await getSupabaseAdmin()
      .from('car_listings')
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
        make: doc.make,
        model: doc.model,
        status: doc.status,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error('PUT /listings/cars/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
