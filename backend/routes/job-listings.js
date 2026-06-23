const express = require('express');
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');
const JobListing = require('../models/JobListing');
const RealEstateCity = require('../models/RealEstateCity');
const { validateJobPayload } = require('../lib/job-field-rules');
const { attachOwnerMetrics } = require('../lib/listing-metrics');
const { notifyAdminsListingSubmitted } = require('../lib/listing-moderation');
const { sanitizeImageUrls } = require('../lib/image-upload');

const router = express.Router();

const MAX_JOB_IMAGES = 5;

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë individuale ose të biznesit.' });
  }
  next();
}

function formatMineListing(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    industry: doc.industry,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    education: doc.education,
    experience: doc.experience,
    jobType: doc.jobType,
    workLocation: doc.workLocation,
    salary: doc.salary ?? null,
    currency: doc.currency ?? null,
    contactPhone: doc.contactPhone ?? null,
    responsibilities: doc.responsibilities ?? [],
    requirements: doc.requirements ?? [],
    benefits: doc.benefits ?? [],
    imageUrls: doc.imageUrls ?? [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** GET /api/listings/jobs/mine */
router.get('/mine', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const posterModel = req.user.constructor.modelName;
    const docs = await JobListing.find({ posterId: req.user._id, posterModel })
      .sort({ createdAt: -1 })
      .lean();

    const cityIds = [...new Set(docs.map((d) => String(d.cityId)).filter(Boolean))];
    const cityObjectIds = cityIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    const cities = cityObjectIds.length > 0 ? await RealEstateCity.find({ _id: { $in: cityObjectIds } }).lean() : [];
    const cityById = new Map(cities.map((c) => [String(c._id), c]));

    const listings = docs.map((d) => formatMineListing(d, cityById));
    res.json({ listings: await attachOwnerMetrics(listings, 'job') });
  } catch (err) {
    console.error('GET /listings/jobs/mine:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/listings/jobs */
router.post('/', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const body = req.body;

    const v = validateJobPayload(body);
    if (!v.ok) return res.status(400).json({ message: v.message });

    // Verify city exists.
    const cityId = String(body.cityId).trim();
    const city = await RealEstateCity.findById(cityId).lean();
    if (!city) return res.status(400).json({ message: 'Qyteti nuk u gjet.' });

    const posterModel = req.user.constructor.modelName;

    const hasSalary = body.salary !== null && body.salary !== undefined && String(body.salary).trim() !== '';

    const doc = await JobListing.create({
      posterId: req.user._id,
      posterModel,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      industry: body.industry,
      cityId: new mongoose.Types.ObjectId(cityId),
      education: body.education,
      experience: body.experience,
      jobType: body.jobType,
      workLocation: body.workLocation,
      salary: hasSalary ? Number(body.salary) : null,
      currency: hasSalary ? body.currency : null,
      contactPhone: String(body.contactPhone || '').trim(),
      responsibilities: v.responsibilities,
      requirements: v.requirements,
      benefits: v.benefits,
      imageUrls: sanitizeImageUrls(body.imageUrls, MAX_JOB_IMAGES),
    });

    await notifyAdminsListingSubmitted('jobs', doc._id, doc.title);

    res.status(201).json({
      message: 'Njoftimi u dërgua për aprovim..',
      listing: {
        id: String(doc._id),
        title: doc.title,
        industry: doc.industry,
        status: doc.status,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('POST /listings/jobs:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
