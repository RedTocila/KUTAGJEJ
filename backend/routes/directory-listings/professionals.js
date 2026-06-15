const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../../middleware/auth');
const requirePortalUser = require('../../middleware/require-portal-user');
const DirectoryListing = require('../../models/DirectoryListing');
const RealEstateCity = require('../../models/RealEstateCity');
const {
  validateProfessionalPayload,
  PROFESSIONAL_CATEGORIES,
} = require('../../lib/directory-professional-validation');
const { attachOwnerMetrics } = require('../../lib/listing-metrics');
const { buildCityIndexFromDocs } = require('../../lib/directory-listings/city-index');
const { formatMineProfessional } = require('../../lib/directory-listings/format-mine');
const { notifyAdminsListingSubmitted } = require('../../lib/listing-moderation');

const router = express.Router();

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

    await notifyAdminsListingSubmitted('professionals', doc._id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u dërgua për aprovim..',
      listing: { id: String(doc._id), title: doc.title, status: doc.status, createdAt: doc.createdAt },
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
