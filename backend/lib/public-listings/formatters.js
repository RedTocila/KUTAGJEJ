const { realEstatePermalink } = require('../real-estate-permalink');
const { listingPermalinkFromDoc } = require('../listing-permalink');
const { computeOpenStatus, formatWeeklyHoursLine } = require('../business-hours');
const { BUSINESS_CATEGORY_LABELS, PROFESSIONAL_CATEGORY_LABELS } = require('./constants');
const { jobListingExpiresAt, isPremiumActive, isOkazionActive } = require('./query-helpers');
const { pickImage, isPersistableImageUrl, snippet, carSlugSource, carDisplayTitle } = require('./text-helpers');
const { comparePriceFromDoc } = require('../listing-compare-price');
const { extractPlaceQueryFromMapsUrl } = require('../google-maps-location');
const { mapsJsonFromDoc } = require('../listing-maps-fields');
const { sanitizeRequiredRoles } = require('../job-required-roles');

function durableImageUrls(doc, { max = null } = {}) {
  const urls = Array.isArray(doc.imageUrls)
    ? doc.imageUrls.map((u) => String(u || '').trim()).filter(isPersistableImageUrl)
    : [];
  return max == null ? urls : urls.slice(0, max);
}

function premiumCardFields(doc) {
  const until = doc.premiumUntil ?? doc.premium_until ?? null;
  const active = isPremiumActive(doc);
  return {
    isPremium: active,
    premiumUntil: active && until ? new Date(until).toISOString() : null,
  };
}

function okazionCardFields(doc) {
  const until = doc.okazionUntil ?? doc.okazion_until ?? null;
  const active = isOkazionActive(doc);
  return {
    isOkazion: active,
    okazionUntil: active && until ? new Date(until).toISOString() : null,
  };
}

function featuredCardFields(doc) {
  return {
    ...premiumCardFields(doc),
    ...okazionCardFields(doc),
  };
}

/** Publish time stays on createdAt; bump time drives feed order + card footer. */
function bumpTimeFields(doc) {
  const createdAt = doc.createdAt ?? doc.created_at ?? null;
  const bumpedRaw = doc.bumpedAt ?? doc.bumped_at ?? null;
  const bumpedAt = bumpedRaw ? new Date(bumpedRaw).toISOString() : createdAt;
  return { createdAt, bumpedAt };
}

/** List cards only need the cover — never ship full galleries. */
function coverImageUrls(doc) {
  const cover = pickImage(doc);
  return cover ? [cover] : [];
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
    originalPrice: comparePriceFromDoc(doc, 'originalPrice', 'original_price'),
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
    imageUrls: coverImageUrls(doc),
    ...bumpTimeFields(doc),
    permalinkPath: realEstatePermalink(doc),
    ...featuredCardFields(doc),
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
    originalPrice: comparePriceFromDoc(doc, 'originalPrice', 'original_price'),
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
    imageUrls: durableImageUrls(doc),
    ...bumpTimeFields(doc),
    updatedAt: doc.updatedAt ?? doc.createdAt,
    seller,
    permalinkPath: realEstatePermalink(doc),
    ...featuredCardFields(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatCar(doc, cityById) {
  const city = cityById.get(doc.cityId);
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: doc.id,
    kind: 'car',
    description: snippet(doc.description),
    vehicleType: doc.vehicleType || 'car',
    make: doc.make,
    model: doc.model,
    variant: doc.variant || '',
    year: doc.year,
    kilometers: doc.kilometers,
    transmission: doc.transmission,
    fuelType: doc.fuelType,
    price: doc.price,
    originalPrice: comparePriceFromDoc(doc, 'originalPrice', 'original_price'),
    currency: doc.currency,
    color: doc.color,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: coverImageUrls(doc),
    ...bumpTimeFields(doc),
    permalinkPath: listingPermalinkFromDoc(doc, carSlugSource(doc)),
    ...featuredCardFields(doc),
  };
}

function formatJob(doc, cityById) {
  const city = cityById.get(doc.cityId);
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  const times = bumpTimeFields(doc);
  return {
    id: doc.id,
    kind: 'job',
    title: doc.title,
    description: snippet(doc.description),
    coverMode: doc.coverMode === 'mockup' ? 'mockup' : 'image',
    industry: doc.industry,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    education: doc.education,
    experience: doc.experience,
    jobType: doc.jobType,
    workLocation: doc.workLocation,
    preferredGender: doc.preferredGender ?? null,
    preferredAgeMin: doc.preferredAgeMin ?? null,
    preferredAgeMax: doc.preferredAgeMax ?? null,
    salary: doc.salary ?? null,
    currency: doc.currency ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: coverImageUrls(doc),
    ...times,
    expiresAt: jobListingExpiresAt(times.createdAt, times.bumpedAt),
    permalinkPath: listingPermalinkFromDoc(doc, doc.title),
    responsibilities: Array.isArray(doc.responsibilities) ? doc.responsibilities.filter(Boolean) : [],
    requirements: Array.isArray(doc.requirements) ? doc.requirements.filter(Boolean) : [],
    requiredRoles: sanitizeRequiredRoles(
      Array.isArray(doc.requiredRoles) ? doc.requiredRoles.filter(Boolean) : [],
    ),
    benefits: Array.isArray(doc.benefits)
      ? doc.benefits.map((b) => ({ id: String(b.id), label: String(b.label) }))
      : [],
    ...featuredCardFields(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMarketplace(doc, cityById) {
  const city = cityById.get(doc.cityId);
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: doc.id,
    kind: 'marketplace',
    transactionType: doc.transactionType,
    title: doc.title,
    description: snippet(doc.description),
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    originalPrice: comparePriceFromDoc(doc, 'originalPrice', 'original_price'),
    currency: doc.currency ?? null,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrl: pickImage(doc),
    imageUrls: coverImageUrls(doc),
    ...bumpTimeFields(doc),
    permalinkPath: listingPermalinkFromDoc(doc, doc.title),
    ...featuredCardFields(doc),
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
    portfolioItems: (doc.portfolioItems ?? [])
      .filter((item) => isPersistableImageUrl(item.imageUrl))
      .map((item) => ({
        id: String(item.id),
        title: String(item.title),
        description: String(item.description || ''),
        imageUrl: String(item.imageUrl).trim(),
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
    menuItems: (doc.menuItems ?? []).map((item) => {
      const raw = item.imageUrl?.trim() || null;
      return {
        id: String(item.id),
        categoryId: String(item.categoryId),
        name: String(item.name),
        description: String(item.description || ''),
        price: item.price,
        currency: item.currency === 'LEK' ? 'LEK' : 'EUR',
        imageUrl: isPersistableImageUrl(raw) ? raw : null,
        sortOrder: item.sortOrder ?? 0,
      };
    }),
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
    imageUrls: coverImageUrls(doc),
    ...bumpTimeFields(doc),
    permalinkPath: listingPermalinkFromDoc(doc, doc.title),
    // Directory profiles support Premium only — OKAZION is for sellable ads.
    ...premiumCardFields(doc),
  };
  if (vertical === 'businesses') {
    const weekly = Array.isArray(doc.weeklyHours) ? doc.weeklyHours : [];
    const legacyOh = doc.openingHours != null ? String(doc.openingHours).replace(/\s+/g, ' ').trim() : '';
    const oh = legacyOh || formatWeeklyHoursLine(weekly) || null;
    const { label: openStatusLine } = computeOpenStatus(weekly, legacyOh);
    const city = cityById?.get(String(doc.cityId));
    const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
    const lat =
      typeof doc.locationLat === 'number' ? doc.locationLat : doc.locationLat != null ? Number(doc.locationLat) : null;
    const lng =
      typeof doc.locationLng === 'number' ? doc.locationLng : doc.locationLng != null ? Number(doc.locationLng) : null;
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
      mobileCtaMode: doc.mobileCtaMode === 'reserve' || doc.mobileCtaMode === 'none' ? doc.mobileCtaMode : 'contact',
      zoneId: doc.zoneId ? String(doc.zoneId) : null,
      zoneName: zone?.name ?? null,
      mapsUrl: doc.mapsUrl?.trim() || null,
      mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
      locationAddress: doc.locationAddress?.trim() || null,
      locationLat: Number.isFinite(lat) ? lat : null,
      locationLng: Number.isFinite(lng) ? lng : null,
      servicesHighlight: doc.servicesHighlight?.replace(/\s+/g, ' ').trim() || null,
      announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
      announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
      announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
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
      announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
      announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
      announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
      ...mapsJsonFromDoc(doc),
      mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
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
    announcementTitle: null,
    announcementSubtitle: null,
    announcementBannerUrl: null,
  };
}

function formatCarDetail(doc, cityById, seller) {
  const card = formatCar(doc, cityById);
  return {
    ...card,
    title: carDisplayTitle(doc) || `${doc.make || ''} ${doc.model || ''}`.trim(),
    description: String(doc.description || '').trim(),
    imageUrl: pickImage(doc),
    imageUrls: durableImageUrls(doc),
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
    imageUrl: pickImage(doc),
    imageUrls: durableImageUrls(doc),
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
    imageUrl: pickImage(doc),
    imageUrls: durableImageUrls(doc),
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
    imageUrl: pickImage(doc),
    // Professionals: [0]=cover [1]=avatar; businesses may have multiple photos.
    imageUrls: durableImageUrls(doc),
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
