const express = require('express');
const mongoose = require('mongoose');
const RealEstateListing = require('../models/RealEstateListing');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const CarListing = require('../models/CarListing');
const JobListing = require('../models/JobListing');
const MarketplaceListing = require('../models/MarketplaceListing');
const DirectoryListing = require('../models/DirectoryListing');
const RealEstateCity = require('../models/RealEstateCity');
const { realEstatePermalink } = require('../lib/real-estate-permalink');
const { listingPermalinkFromSlugSource } = require('../lib/listing-permalink');

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
/** Job listings are hidden from public browse after this many days. */
const JOB_LISTING_VISIBLE_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function jobListingExpiresAt(createdAt) {
  const posted = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(posted.getTime() + JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY);
}

function isJobListingActive(doc) {
  return Date.now() < jobListingExpiresAt(doc.createdAt).getTime();
}

function activeJobCreatedAtFilter() {
  return { createdAt: { $gte: new Date(Date.now() - JOB_LISTING_VISIBLE_DAYS * MS_PER_DAY) } };
}

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

function carSlugSource(doc) {
  return [doc.make, doc.model, doc.variant, doc.year].filter((x) => x != null && String(x).trim()).join(' ');
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
    permalinkPath: realEstatePermalink(doc),
  };
}

async function loadPosterBrief(posterModel, posterId) {
  try {
    if (!posterId || !mongoose.Types.ObjectId.isValid(posterId)) return null;
    if (posterModel === 'IndividualUser') {
      const u = await IndividualUser.findById(posterId).select('firstName lastName phone createdAt').lean();
      if (!u) return null;
      const displayName =
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Përdorues';
      return {
        kind: 'individual',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
      };
    }
    if (posterModel === 'BusinessUser') {
      const u = await BusinessUser.findById(posterId)
        .select('firstName lastName phone createdAt businessName businessOwner')
        .lean();
      if (!u) return null;
      const displayName =
        (u.businessName && String(u.businessName).trim()) ||
        (u.businessOwner && String(u.businessOwner).trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        'Biznes';
      return {
        kind: 'business',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
      };
    }
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
  }
  return null;
}

/** One public listing with full description and poster summary (SEO / detail page). */
function formatRealEstateDetail(doc, cityById, seller) {
  const city = cityById.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z._id) === String(doc.zoneId));
  return {
    id: String(doc._id),
    kind: 'real-estate',
    title: doc.title,
    description: String(doc.description || '').trim(),
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
    totalFloors: doc.totalFloors ?? null,
    parkingFloor: doc.parkingFloor ?? null,
    apartmentTypeSlug: doc.apartmentTypeSlug ?? null,
    furnishing: doc.furnishing ?? null,
    yearBuilt: doc.yearBuilt ?? null,
    condition: doc.condition ?? null,
    contactPhone: doc.contactPhone?.trim() || null,
    imageUrl: pickImage(doc),
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    seller,
    permalinkPath: realEstatePermalink(doc),
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
    permalinkPath: listingPermalinkFromSlugSource(carSlugSource(doc), doc._id),
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
    expiresAt: jobListingExpiresAt(doc.createdAt),
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc._id),
  };
}

function formatMarketplace(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  return {
    id: String(doc._id),
    kind: 'marketplace',
    transactionType: doc.transactionType,
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
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc._id),
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
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc._id),
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

function carDisplayTitle(doc) {
  return [doc.make, doc.model, doc.variant]
    .filter((x) => x != null && String(x).trim())
    .join(' ')
    .trim();
}

function formatCarDetail(doc, cityById, seller) {
  const card = formatCar(doc, cityById);
  return {
    ...card,
    title: carDisplayTitle(doc) || `${doc.make || ''} ${doc.model || ''}`.trim(),
    description: String(doc.description || '').trim(),
    extras: Array.isArray(doc.extras) ? doc.extras.map(String).filter(Boolean) : [],
    finish: Array.isArray(doc.finish) ? doc.finish.map(String) : [],
    seller,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    permalinkPath: card.permalinkPath,
  };
}

function formatJobDetail(doc, cityById, seller) {
  const card = formatJob(doc, cityById);
  return {
    ...card,
    description: String(doc.description || '').trim(),
    seller,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    permalinkPath: card.permalinkPath,
  };
}

function formatMarketplaceDetail(doc, cityById, seller) {
  const card = formatMarketplace(doc, cityById);
  return {
    ...card,
    description: String(doc.description || '').trim(),
    seller,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    permalinkPath: card.permalinkPath,
  };
}

function formatDirectoryDetail(doc, cityById, seller) {
  const card = formatDirectory(doc, cityById);
  return {
    ...card,
    description: String(doc.description || '').trim(),
    seller,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    permalinkPath: card.permalinkPath,
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
  const docs = await JobListing.find(activeJobCreatedAtFilter())
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const cityById = await buildCityIndex(docs);
  return docs.map((d) => formatJob(d, cityById));
}

async function countActiveJobs() {
  return JobListing.countDocuments(activeJobCreatedAtFilter());
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
      countActiveJobs(),
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

/** GET /api/public/listings/real-estate/:id — detail + seller summary (SSR / SEO page). */
router.get('/real-estate/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await RealEstateListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatRealEstateDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/real-estate/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cars/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await CarListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatCarDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/cars/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/jobs/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await JobListing.findById(rawId).lean();
    if (!doc || !isJobListingActive(doc)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatJobDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/jobs/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/marketplace/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await MarketplaceListing.findById(rawId).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatMarketplaceDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/marketplace/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/businesses/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      vertical: 'businesses',
    }).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatDirectoryDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/businesses/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/professionals/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(rawId)) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const doc = await DirectoryListing.findOne({
      _id: rawId,
      vertical: 'professionals',
    }).lean();
    if (!doc) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const seller = await loadPosterBrief(doc.posterModel, doc.posterId);
    const cityById = await buildCityIndex([doc]);
    res.json({ listing: formatDirectoryDetail(doc, cityById, seller) });
  } catch (err) {
    console.error('GET /public/listings/professionals/:id:', err?.message || err);
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
