const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const DirectoryListing = require('../../models/DirectoryListing');
const RealEstateCity = require('../../models/RealEstateCity');
const { validateBusinessPayload, BUSINESS_CATEGORIES } = require('../../lib/directory-business-validation');
const { attachOwnerMetrics } = require('../../lib/listing-metrics');
const { buildCityIndexFromDocs } = require('../../lib/directory-listings/city-index');
const { formatMineBusiness } = require('../../lib/directory-listings/format-mine');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');

const router = express.Router();

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

    await notifyAdminsListingSubmitted('businesses', doc._id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u dërgua për aprovim..',
      listing: { id: String(doc._id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
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

module.exports = router;
