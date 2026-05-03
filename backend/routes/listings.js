const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const RealEstateCity = require('../models/RealEstateCity');
const RealEstateListing = require('../models/RealEstateListing');
const {
  validateRealEstatePayload,
  needsCondition,
  needsFloor,
  needsTotalFloors,
  needsParkingFloor,
  needsBedroomsBathFurnishing,
  needsYearBuilt,
} = require('../lib/real-estate-field-rules');

const router = express.Router();

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
  const zone = city?.zones?.find((z) => String(z._id) === String(doc.zoneId));
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    propertyCategory: doc.propertyCategory,
    transactionType: doc.transactionType,
    price: doc.price,
    currency: doc.currency,
    surfaceM2: doc.surfaceM2,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
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
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Portal user: their saved real-estate listings (newest first). */
router.get('/real-estate/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const posterModel = req.user.constructor.modelName;
    const docs = await RealEstateListing.find({
      posterId: req.user._id,
      posterModel,
    })
      .sort({ createdAt: -1 })
      .lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    const cities =
      cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

    res.json({ listings: docs.map((d) => formatMineListing(d, cityById)) });
  } catch (error) {
    console.error('GET /listings/real-estate/mine:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/real-estate', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const v = validateRealEstatePayload(req.body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    const cityId = req.body.cityId;
    const zoneId = req.body.zoneId;
    if (!mongoose.isValidObjectId(cityId) || !mongoose.isValidObjectId(zoneId)) {
      return res.status(400).json({ message: 'Invalid city or zone id.' });
    }

    const city = await RealEstateCity.findById(cityId);
    if (!city) return res.status(400).json({ message: 'City not found.' });
    const zone = city.zones.id(zoneId);
    if (!zone) return res.status(400).json({ message: 'Zone does not belong to the selected city.' });
    void zone;

    const propertyCategory = String(req.body.propertyCategory).trim().toLowerCase();
    const posterModel = req.user.constructor.modelName;
    const contactPhone = String(req.body.contactPhone ?? '').trim();

    const doc = await RealEstateListing.create({
      posterId: req.user._id,
      posterModel,
      propertyCategory,
      title: String(req.body.title).trim(),
      description: String(req.body.description).trim(),
      transactionType: req.body.transactionType,
      price: Number(req.body.price),
      currency: req.body.currency,
      surfaceM2: Number(req.body.surfaceM2),
      cityId,
      zoneId,
      contactPhone,
      condition: needsCondition(propertyCategory) ? req.body.condition : undefined,
      floor: needsFloor(propertyCategory) ? Number(req.body.floor) : undefined,
      totalFloors: needsTotalFloors(propertyCategory) ? Number(req.body.totalFloors) : undefined,
      parkingFloor: needsParkingFloor(propertyCategory) ? Number(req.body.parkingFloor) : undefined,
      bedrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bedrooms) : undefined,
      bathrooms: needsBedroomsBathFurnishing(propertyCategory) ? Number(req.body.bathrooms) : undefined,
      furnishing: needsBedroomsBathFurnishing(propertyCategory) ? req.body.furnishing : undefined,
      yearBuilt: needsYearBuilt(propertyCategory) ? Number(req.body.yearBuilt) : undefined,
    });

    res.status(201).json({
      listing: {
        id: String(doc._id),
        propertyCategory: doc.propertyCategory,
        title: doc.title,
        createdAt: doc.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /listings/real-estate:', error?.message || error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
