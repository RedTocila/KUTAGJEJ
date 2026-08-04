const { realEstatePermalink } = require('../real-estate-permalink');
const { listingPermalinkFromSlugSource } = require('../listing-permalink');
const { computeOpenStatus, formatWeeklyHoursLine } = require('../business-hours');
const { BUSINESS_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_LABELS } = require('./constants');
const { jobListingExpiresAt, isPremiumActive } = require('./query-helpers');
const { pickImage, snippet, carSlugSource, carDisplayTitle } = require('./text-helpers');

function premiumCardFields(doc) {
  const until = doc.premiumUntil ?? doc.premium_until ?? null;
  const active = isPremiumActive(doc);
  return {
    isPremium: active,
    premiumUntil: active && until ? new Date(until).toISOString() : null,
  };
}

function formatRealEstate(doc, cityById) {
  const city = cityById.get(doc.cityId);
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: doc.id,
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
    ...premiumCardFields(doc),
  };
}

/** One public listing with full description and poster summary (SEO / detail page). */
function formatRealEstateDetail(doc, cityById, seller) {
  const city = cityById.get(doc.cityId);
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: doc.id,
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
    ...premiumCardFields(doc),
  };
}

function formatCar(doc, cityById) {
  const city = cityById.get(doc.cityId);
  return {
    id: doc.id,
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
    permalinkPath: listingPermalinkFromSlugSource(carSlugSource(doc), doc.id),
    ...premiumCardFields(doc),
  };
}

function formatJob(doc, cityById) {
  const city = cityById.get(doc.cityId);
  return {
    id: doc.id,
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
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc.id),
    responsibilities: Array.isArray(doc.responsibilities) ? doc.responsibilities.filter(Boolean) : [],
    requirements: Array.isArray(doc.requirements) ? doc.requirements.filter(Boolean) : [],
    benefits: Array.isArray(doc.benefits)
      ? doc.benefits.map((b) => ({ id: String(b.id), label: String(b.label) }))
      : [],
    ...premiumCardFields(doc),
  };
}

function formatMarketplace(doc, cityById) {
  const city = cityById.get(doc.cityId);
  return {
    id: doc.id,
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
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc.id),
    ...premiumCardFields(doc),
  };
}

function directoryCategoryLabel(vertical, categorySlug) {
  const map = vertical === 'businesses' ? BUSINESS_CATEGORY_LABELS : PROFESSIONAL_CATEGORY_LABELS;
  return map[categorySlug] ?? categorySlug;
}

function directoryReviewFields(doc, reviewStats) {
  const stats = reviewStats?.get(doc.id);
  return {
    ratingAverage: stats?.ratingAverage ?? null,
    reviewCount: stats?.reviewCount ?? 0,
  };
}

function formatProfessionalPortfolioPayload(doc) {
  return {
    portfolioItems: (doc.portfolioItems ?? []).map((item) => ({
      id: String(item.id),
      title: String(item.title),
      description: String(item.description || ''),
      imageUrl: String(item.imageUrl),
      location: item.location?.trim() || null,
      sortOrder: item.sortOrder ?? 0,
    })),
  };
}

function formatBusinessMenuPayload(doc) {
  return {
    menuCategories: (doc.menuCategories ?? []).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      sortOrder: c.sortOrder ?? 0,
    })),
    menuItems: (doc.menuItems ?? []).map((item) => ({
      id: String(item.id),
      categoryId: String(item.categoryId),
      name: String(item.name),
      description: String(item.description || ''),
      price: item.price,
      currency: item.currency === 'LEK' ? 'LEK' : 'EUR',
      imageUrl: item.imageUrl?.trim() || null,
      sortOrder: item.sortOrder ?? 0,
    })),
  };
}

function formatDirectory(doc, cityById, reviewStats) {
  const city = cityById.get(doc.cityId);
  const vertical = doc.vertical;
  const categorySlug = doc.category;
  const base = {
    id: doc.id,
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
    permalinkPath: listingPermalinkFromSlugSource(doc.title, doc.id),
    ...premiumCardFields(doc),
  };
  if (vertical === 'businesses') {
    const weekly = Array.isArray(doc.weeklyHours) ? doc.weeklyHours : [];
    const legacyOh = doc.openingHours != null ? String(doc.openingHours).replace(/\s+/g, ' ').trim() : '';
    const oh = legacyOh || formatWeeklyHoursLine(weekly) || null;
    const { label: openStatusLine } = computeOpenStatus(weekly, legacyOh);
    return {
      ...base,
      condition: null,
      price: null,
      currency: null,
      openingHours: oh,
      openStatusLine,
      ...directoryReviewFields(doc, reviewStats),
      reservationsEnabled: Boolean(doc.reservationsEnabled),
      reservationUrl: doc.reservationUrl?.trim() || null,
      servicesHighlight: doc.servicesHighlight?.replace(/\s+/g, ' ').trim() || null,
    };
  }
  if (vertical === 'professionals') {
    return {
      ...base,
      condition: doc.condition ?? null,
      price: doc.price ?? null,
      currency: doc.currency ?? null,
      ...directoryReviewFields(doc, reviewStats),
      responseTimeHours: doc.responseTimeHours ?? null,
      servicesHighlight: doc.servicesHighlight?.replace(/\s+/g, ' ').trim() || null,
      openingHours: null,
      reservationsEnabled: false,
      reservationUrl: null,
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

function formatDirectoryDetail(doc, cityById, seller, reviewStats) {
  const card = formatDirectory(doc, cityById, reviewStats);
  const base = {
    ...card,
    description: String(doc.description || '').trim(),
    seller,
    updatedAt: doc.updatedAt ?? doc.createdAt,
    permalinkPath: card.permalinkPath,
  };
  if (doc.vertical === 'businesses') {
    return {
      ...base,
      weeklyHours: Array.isArray(doc.weeklyHours) ? doc.weeklyHours : [],
      ...formatBusinessMenuPayload(doc),
      reservationTimeSlots: doc.reservationTimeSlots ?? [],
      reservationPartySizes: doc.reservationPartySizes ?? [],
    };
  }
  if (doc.vertical === 'professionals') {
    return {
      ...base,
      ...formatProfessionalPortfolioPayload(doc),
    };
  }
  return base;
}

module.exports = {
  formatRealEstate,
  formatRealEstateDetail,
  formatCar,
  formatCarDetail,
  formatJob,
  formatJobDetail,
  formatMarketplace,
  formatMarketplaceDetail,
  formatDirectory,
  formatDirectoryDetail,
};
