const express = require('express');
const mongoose = require('mongoose');
const RealEstateListing = require('../models/RealEstateListing');
const CarListing = require('../models/CarListing');
const JobListing = require('../models/JobListing');
const MarketplaceListing = require('../models/MarketplaceListing');
const DirectoryListing = require('../models/DirectoryListing');
const RealEstateCity = require('../models/RealEstateCity');

/** Venue & service categories for Biznese (not commercial real estate). */
const BUSINESS_CATEGORY_LABELS = {
  restorant: 'Restorant',
  bar: 'Bar & pub',
  kafe: 'Kafene',
  brunch: 'Brunch & mëngjes',
  'piceri-fast-food': 'Piceri & fast food',
  pasticeri: 'Pastiçeri & ëmbëlsira',
};
const PROFESSIONAL_CATEGORY_LABELS = {
  konsulent: 'Konsulence',
  freelance: 'Freelance',
  sherbim: 'Shërbime profesionale',
  kurse: 'Kurse & trajnim',
  'dizajn-it': 'Dizajn & IT',
  marketing: 'Marketing',
  mjekesi: 'Mjekësi',
  arsim: 'Arsim',
};

const router = express.Router();

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

function clampLimit(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

async function buildCityIndex(docs) {
  const cityIds = [
    ...new Set(
      docs
        .map((d) => (d.cityId ? String(d.cityId) : null))
        .filter((id) => id && mongoose.isValidObjectId(id)),
    ),
  ];
  if (cityIds.length === 0) return new Map();
  const cities = await RealEstateCity.find({
    _id: { $in: cityIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();
  return new Map(cities.map((c) => [String(c._id), c]));
}

function pickImage(doc) {
  return Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0 ? doc.imageUrls[0] : null;
}

/** Trim a long description to a card-friendly snippet (no mid-word cuts). */
function snippet(text, max = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function formatRealEstate(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z._id) === String(doc.zoneId));
  return {
    id: String(doc._id),
    kind: 'real-estate',
    title: doc.title,
    description: snippet(doc.description),
    propertyCategory: doc.propertyCategory,
    transactionType: doc.transactionType,
    price: doc.price,
    currency: doc.currency,
    surfaceM2: doc.surfaceM2,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    floor: doc.floor ?? null,
    furnishing: doc.furnishing ?? null,
    yearBuilt: doc.yearBuilt ?? null,
    condition: doc.condition ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: doc.imageUrls ?? [],
    createdAt: doc.createdAt,
  };
}

function formatCar(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  return {
    id: String(doc._id),
    kind: 'car',
    description: snippet(doc.description),
    make: doc.make,
    model: doc.model,
    variant: doc.variant || '',
    year: doc.year,
    kilometers: doc.kilometers,
    transmission: doc.transmission,
    fuelType: doc.fuelType,
    price: doc.price,
    currency: doc.currency,
    color: doc.color,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0 ? doc.imageUrls[0] : null,
    imageUrls: doc.imageUrls ?? [],
    createdAt: doc.createdAt,
  };
}

function formatJob(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  return {
    id: String(doc._id),
    kind: 'job',
    title: doc.title,
    description: snippet(doc.description),
    industry: doc.industry,
    cityName: city?.name ?? null,
    education: doc.education,
    experience: doc.experience,
    jobType: doc.jobType,
    workLocation: doc.workLocation,
    salary: doc.salary ?? null,
    currency: doc.currency ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: doc.imageUrls ?? [],
    createdAt: doc.createdAt,
  };
}

function formatMarketplace(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  return {
    id: String(doc._id),
    kind: 'marketplace',
    title: doc.title,
    description: snippet(doc.description),
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: doc.imageUrls ?? [],
    createdAt: doc.createdAt,
  };
}

function directoryCategoryLabel(vertical, categorySlug) {
  const map = vertical === 'businesses' ? BUSINESS_CATEGORY_LABELS : PROFESSIONAL_CATEGORY_LABELS;
  return map[categorySlug] ?? categorySlug;
}

function formatDirectory(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  const vertical = doc.vertical;
  const categorySlug = doc.category;
  const base = {
    id: String(doc._id),
    kind: vertical,
    title: doc.title,
    description: snippet(doc.description),
    category: categorySlug,
    categoryLabel: directoryCategoryLabel(vertical, categorySlug),
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: doc.imageUrls ?? [],
    createdAt: doc.createdAt,
  };
  if (vertical === 'businesses') {
    const oh = doc.openingHours != null ? String(doc.openingHours).replace(/\s+/g, ' ').trim() : '';
    return {
      ...base,
      condition: null,
      price: null,
      currency: null,
      openingHours: oh || null,
      reservationsEnabled: Boolean(doc.reservationsEnabled),
      reservationUrl: doc.reservationUrl?.trim() || null,
      servicesHighlight: doc.servicesHighlight?.replace(/\s+/g, ' ').trim() || null,
    };
  }
  return {
    ...base,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    openingHours: null,
    reservationsEnabled: false,
    reservationUrl: null,
    servicesHighlight: null,
  };
}

async function latestRealEstate(limit) {
  const docs = await RealEstateListing.find().sort({ createdAt: -1 }).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatRealEstate(d, cityById));
}

async function latestCars(limit) {
  const docs = await CarListing.find().sort({ createdAt: -1 }).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatCar(d, cityById));
}

async function latestJobs(limit) {
  const docs = await JobListing.find().sort({ createdAt: -1 }).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatJob(d, cityById));
}

async function latestMarketplace(limit) {
  const docs = await MarketplaceListing.find().sort({ createdAt: -1 }).limit(limit).lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatMarketplace(d, cityById));
}

async function latestDirectory(vertical, limit) {
  const docs = await DirectoryListing.find({ vertical })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatDirectory(d, cityById));
}

/** GET /api/public/listings/latest — newest listings per vertical (homepage). */
router.get('/latest', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    const [realEstate, cars, jobs, marketplace, businesses, professionals] = await Promise.all([
      latestRealEstate(limit),
      latestCars(limit),
      latestJobs(limit),
      latestMarketplace(limit),
      latestDirectory('businesses', limit),
      latestDirectory('professionals', limit),
    ]);
    const counts = await Promise.all([
      RealEstateListing.estimatedDocumentCount(),
      CarListing.estimatedDocumentCount(),
      JobListing.estimatedDocumentCount(),
      MarketplaceListing.estimatedDocumentCount(),
      DirectoryListing.countDocuments({ vertical: 'businesses' }),
      DirectoryListing.countDocuments({ vertical: 'professionals' }),
    ]);
    res.json({
      realEstate,
      cars,
      jobs,
      marketplace,
      businesses,
      professionals,
      totals: {
        realEstate: counts[0],
        cars: counts[1],
        jobs: counts[2],
        marketplace: counts[3],
        businesses: counts[4],
        professionals: counts[5],
      },
    });
  } catch (err) {
    console.error('GET /public/listings/latest:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/real-estate', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestRealEstate(limit) });
  } catch (err) {
    console.error('GET /public/listings/real-estate:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestCars(limit) });
  } catch (err) {
    console.error('GET /public/listings/cars:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestJobs(limit) });
  } catch (err) {
    console.error('GET /public/listings/jobs:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestMarketplace(limit) });
  } catch (err) {
    console.error('GET /public/listings/marketplace:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestDirectory('businesses', limit) });
  } catch (err) {
    console.error('GET /public/listings/businesses:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit);
    res.json({ listings: await latestDirectory('professionals', limit) });
  } catch (err) {
    console.error('GET /public/listings/professionals:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
