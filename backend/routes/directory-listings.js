const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const DirectoryListing = require('../models/DirectoryListing');
const BusinessReservation = require('../models/BusinessReservation');
const RealEstateCity = require('../models/RealEstateCity');
const { validateBusinessPayload, BUSINESS_CATEGORIES } = require('../lib/directory-business-validation');
const {
  validateProfessionalPayload,
  PROFESSIONAL_CATEGORIES,
} = require('../lib/directory-professional-validation');
const { attachOwnerMetrics } = require('../lib/listing-metrics');

const router = express.Router();

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë individuale ose të biznesit.' });
  }
  next();
}

function formatMineBusiness(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: String(doc._id),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: doc.imageUrls ?? [],
    openingHours: doc.openingHours ?? null,
    weeklyHours: doc.weeklyHours ?? [],
    menuCategories: doc.menuCategories ?? [],
    menuItems: doc.menuItems ?? [],
    reservationsEnabled: Boolean(doc.reservationsEnabled),
    reservationUrl: doc.reservationUrl ?? null,
    reservationTimeSlots: doc.reservationTimeSlots ?? [],
    reservationPartySizes: doc.reservationPartySizes ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** GET /api/listings/directory/businesses/mine */
router.get('/businesses/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const posterModel = req.user.constructor.modelName;
    const docs = await DirectoryListing.find({
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    })
      .sort({ createdAt: -1 })
      .lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const cities =
      cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

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
    const city = await RealEstateCity.findById(cityId).lean();
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const posterModel = req.user.constructor.modelName;
    const imageUrls = v.imageUrls ?? [];

    const doc = await DirectoryListing.create({
      vertical: 'businesses',
      posterId: req.user._id,
      posterModel,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      cityId: new mongoose.Types.ObjectId(cityId),
      contactPhone: String(body.contactPhone || '').trim(),
      imageUrls,
      openingHours: v.openingHours,
      weeklyHours: v.weeklyHours,
      menuCategories: v.menuCategories,
      menuItems: v.menuItems,
      reservationsEnabled: v.reservationsEnabled,
      reservationUrl: v.reservationUrl,
      reservationTimeSlots: v.reservationTimeSlots,
      reservationPartySizes: v.reservationPartySizes,
      servicesHighlight: v.servicesHighlight,
    });

    res.status(201).json({
      listing: { id: String(doc._id), title: doc.title, createdAt: doc.createdAt },
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
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const posterModel = req.user.constructor.modelName;
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    });
    if (!doc) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validateBusinessPayload(body, { partial: true });
    if (!v.ok) return res.status(400).json({ message: v.message });

    if (body.title != null) doc.title = String(body.title).trim();
    if (body.description != null) doc.description = String(body.description).trim();
    if (body.category != null) {
      if (!BUSINESS_CATEGORIES.has(body.category)) {
        return res.status(400).json({ message: 'Kategoria nuk është e vlefshme.' });
      }
      doc.category = body.category;
    }
    if (body.cityId != null) {
      const cityId = String(body.cityId).trim();
      const city = await RealEstateCity.findById(cityId).lean();
      if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      doc.cityId = new mongoose.Types.ObjectId(cityId);
    }
    if (body.contactPhone != null) doc.contactPhone = String(body.contactPhone).trim();

    doc.openingHours = v.openingHours;
    doc.weeklyHours = v.weeklyHours;
    doc.menuCategories = v.menuCategories;
    doc.menuItems = v.menuItems;
    doc.reservationsEnabled = v.reservationsEnabled;
    doc.reservationUrl = v.reservationUrl;
    doc.reservationTimeSlots = v.reservationTimeSlots;
    doc.reservationPartySizes = v.reservationPartySizes;
    doc.servicesHighlight = v.servicesHighlight;
    if (v.imageUrls != null) doc.imageUrls = v.imageUrls;

    await doc.save();
    res.json({ listing: { id: String(doc._id), title: doc.title, updatedAt: doc.updatedAt } });
  } catch (err) {
    console.error('PUT /listings/directory/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/listings/directory/businesses/:id/reservations */
router.get('/businesses/:id/reservations', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const posterModel = req.user.constructor.modelName;
    const listing = await DirectoryListing.findOne({
      _id: rawId,
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    }).lean();
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const status = String(req.query.status || 'all').trim();
    const filter = { listingId: listing._id };
    if (status === 'pending') filter.status = 'pending';

    const rows = await BusinessReservation.find(filter).sort({ createdAt: -1 }).limit(200).lean();

    res.json({
      reservations: rows.map((r) => ({
        id: String(r._id),
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
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });
    }

    const row = await BusinessReservation.findById(rawId);
    if (!row) return res.status(404).json({ message: 'Rezervimi nuk u gjet.' });

    const posterModel = req.user.constructor.modelName;
    const listing = await DirectoryListing.findOne({
      _id: row.listingId,
      posterId: req.user._id,
      posterModel,
      vertical: 'businesses',
    });
    if (!listing) return res.status(403).json({ message: 'Nuk keni akses.' });

    const status = String(req.body?.status || '').trim();
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Statusi nuk është i vlefshëm.' });
    }
    row.status = status;
    await row.save();

    res.json({
      reservation: {
        id: String(row._id),
        status: row.status,
      },
    });
  } catch (err) {
    console.error('PATCH reservations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

function formatMineProfessional(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: String(doc._id),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: doc.imageUrls ?? [],
    responseTimeHours: doc.responseTimeHours ?? null,
    portfolioItems: doc.portfolioItems ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** GET /api/listings/directory/professionals/mine */
router.get('/professionals/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const posterModel = req.user.constructor.modelName;
    const docs = await DirectoryListing.find({
      posterId: req.user._id,
      posterModel,
      vertical: 'professionals',
    })
      .sort({ createdAt: -1 })
      .lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const cities =
      cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

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

    const cityId = String(body.cityId).trim();
    const city = await RealEstateCity.findById(cityId).lean();
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const posterModel = req.user.constructor.modelName;
    const imageUrls = v.imageUrls ?? [];

    const doc = await DirectoryListing.create({
      vertical: 'professionals',
      posterId: req.user._id,
      posterModel,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      cityId: new mongoose.Types.ObjectId(cityId),
      contactPhone: String(body.contactPhone || '').trim(),
      imageUrls,
      condition: v.condition,
      price: v.price,
      currency: v.currency,
      responseTimeHours: v.responseTimeHours,
      portfolioItems: v.portfolioItems,
      servicesHighlight: v.servicesHighlight,
    });

    res.status(201).json({
      listing: { id: String(doc._id), title: doc.title, createdAt: doc.createdAt },
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
    if (!mongoose.isValidObjectId(rawId)) {
      return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    }

    const posterModel = req.user.constructor.modelName;
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      posterId: req.user._id,
      posterModel,
      vertical: 'professionals',
    });
    if (!doc) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    const body = req.body;
    const v = validateProfessionalPayload(body, { partial: true });
    if (!v.ok) return res.status(400).json({ message: v.message });

    if (body.title != null) doc.title = String(body.title).trim();
    if (body.description != null) doc.description = String(body.description).trim();
    if (body.category != null) {
      if (!PROFESSIONAL_CATEGORIES.has(body.category)) {
        return res.status(400).json({ message: 'Kategoria nuk është e vlefshme.' });
      }
      doc.category = body.category;
    }
    if (body.cityId != null) {
      const cityId = String(body.cityId).trim();
      const city = await RealEstateCity.findById(cityId).lean();
      if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });
      doc.cityId = new mongoose.Types.ObjectId(cityId);
    }
    if (body.contactPhone != null) doc.contactPhone = String(body.contactPhone).trim();

    doc.responseTimeHours = v.responseTimeHours;
    doc.portfolioItems = v.portfolioItems;
    doc.price = v.price;
    doc.currency = v.currency;
    doc.condition = v.condition;
    doc.servicesHighlight = v.servicesHighlight;
    if (v.imageUrls != null) doc.imageUrls = v.imageUrls;

    await doc.save();
    res.json({ listing: { id: String(doc._id), title: doc.title, updatedAt: doc.updatedAt } });
  } catch (err) {
    console.error('PUT /listings/directory/professionals/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
