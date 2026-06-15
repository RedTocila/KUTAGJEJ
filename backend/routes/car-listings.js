const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { put } = require('@vercel/blob');
const authMiddleware = require('../middleware/auth');
const CarListing = require('../models/CarListing');
const RealEstateCity = require('../models/RealEstateCity');
const { validateCarPayload, FINISH_VALUES } = require('../lib/car-field-rules');
const { attachOwnerMetrics } = require('../lib/listing-metrics');
const { notifyAdminsListingSubmitted, listingTitle } = require('../lib/listing-moderation');

const router = express.Router();

// ---------------------------------------------------------------------------
// Multer — keep files in memory so we can stream them straight to Vercel Blob.
// Max 5 images, 8 MB each.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'This action is only available for individual or business accounts.' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upload a single buffer to Vercel Blob and return its public URL.
 * Falls back to null when BLOB_READ_WRITE_TOKEN is not configured (local dev).
 */
async function uploadToBlob(buffer, originalName, mimetype) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // No Vercel Blob token in local dev — skip upload, return null.
    return null;
  }
  const ext = originalName.split('.').pop() || 'jpg';
  const filename = `car-listings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

/** Normalise extras: accept both extras[] (repeated key) and extras (comma-separated). */
function parseExtras(fields) {
  const raw = fields['extras[]'] || fields['extras'] || [];
  if (Array.isArray(raw)) return raw.map((e) => String(e).trim()).filter(Boolean);
  return String(raw)
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Normalise finish: same pattern as extras. */
function parseFinish(fields) {
  const raw = fields['finish'] || [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((f) => String(f).trim()).filter((f) => FINISH_VALUES.includes(f));
}

function formatMineListing(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: String(doc._id),
    make: doc.make,
    model: doc.model,
    variant: doc.variant || '',
    description: doc.description,
    year: doc.year,
    kilometers: doc.kilometers,
    transmission: doc.transmission,
    fuelType: doc.fuelType,
    price: doc.price,
    currency: doc.currency,
    color: doc.color,
    finish: doc.finish ?? [],
    extras: doc.extras ?? [],
    contactPhone: doc.contactPhone ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: doc.imageUrls ?? [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// GET /api/listings/cars/mine
// ---------------------------------------------------------------------------

router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const posterModel = req.user.constructor.modelName;
    const docs = await CarListing.find({ posterId: req.user._id, posterModel })
      .sort({ createdAt: -1 })
      .lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    const cities = cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

    const listings = docs.map((d) => formatMineListing(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'car') });
  } catch (err) {
    console.error('GET /listings/cars/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/listings/cars
// ---------------------------------------------------------------------------

router.post(
  '/',
  authMiddleware,
  requirePortalUser,
  upload.array('images', 5),
  async (req, res) => {
    try {
      // Multer puts text fields on req.body and files on req.files.
      const fields = req.body;

      const v = validateCarPayload(fields);
      if (!v.ok) return res.status(400).json({ message: v.message });

      // Upload images to Vercel Blob (gracefully skipped if no token).
      const files = req.files || [];
      const imageUrls = [];
      for (const file of files) {
        const url = await uploadToBlob(file.buffer, file.originalname, file.mimetype);
        if (url) imageUrls.push(url);
      }

      // Verify city exists.
      const cityId = String(fields.cityId).trim();
      const city = await RealEstateCity.findById(cityId).lean();
      if (!city) return res.status(400).json({ message: 'City not found.' });

      const posterModel = req.user.constructor.modelName;

      const doc = await CarListing.create({
        posterId: req.user._id,
        posterModel,
        make: String(fields.make).trim(),
        model: String(fields.model).trim(),
        variant: String(fields.variant || '').trim(),
        description: String(fields.description).trim(),
        year: Number(fields.year),
        kilometers: Number(fields.kilometers),
        transmission: fields.transmission,
        fuelType: fields.fuelType,
        price: Number(fields.price),
        currency: fields.currency,
        color: String(fields.color).trim().toLowerCase(),
        finish: parseFinish(fields),
        extras: parseExtras(fields),
        contactPhone: String(fields.contactPhone || '').trim(),
        cityId: new mongoose.Types.ObjectId(cityId),
        imageUrls,
      });

      await notifyAdminsListingSubmitted('cars', doc._id, listingTitle('cars', doc));

      res.status(201).json({
        message: 'Njoftimi u dërgua për aprovim..',
        listing: {
          id: String(doc._id),
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

module.exports = router;
