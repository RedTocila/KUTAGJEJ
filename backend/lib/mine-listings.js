'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { camelizeRows } = require('./profiles');
const { attachOwnerMetrics } = require('./listing-metrics');
const { buildCityIndex } = require('./public-listings/query-helpers');
const { pickImage } = require('./public-listings/text-helpers');
const { premiumFieldsFromDoc } = require('./premium-listing');
const { okazionFieldsFromDoc } = require('./okazion-listing');

/** Soft cap so a pathological owner cannot dump unbounded payloads. */
const DEFAULT_LIMIT_PER_KIND = 200;

const MINE_SELECT = {
  real_estate_listings: [
    'id',
    'title',
    'property_category',
    'transaction_type',
    'price',
    'original_price',
    'currency',
    'surface_m2',
    'city_id',
    'zone_id',
    'condition',
    'apartment_type_slug',
    'floor',
    'total_floors',
    'parking_floor',
    'bedrooms',
    'bathrooms',
    'furnishing',
    'year_built',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
  ].join(','),
  car_listings: [
    'id',
    'vehicle_type',
    'make',
    'model',
    'variant',
    'year',
    'kilometers',
    'transmission',
    'fuel_type',
    'price',
    'original_price',
    'currency',
    'color',
    'city_id',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
  ].join(','),
  job_listings: [
    'id',
    'title',
    'industry',
    'city_id',
    'education',
    'experience',
    'job_type',
    'work_location',
    'salary',
    'currency',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
  ].join(','),
  marketplace_listings: [
    'id',
    'transaction_type',
    'title',
    'category',
    'condition',
    'price',
    'original_price',
    'currency',
    'city_id',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
  ].join(','),
  directory_listings: [
    'id',
    'vertical',
    'title',
    'category',
    'condition',
    'price',
    'currency',
    'city_id',
    'image_urls',
    'services_highlight',
    'announcement_title',
    'announcement_subtitle',
    'announcement_banner_url',
    'announcement_at',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
  ].join(','),
};

function listingId(doc) {
  return doc.id != null ? String(doc.id) : null;
}

/** List cards only need the cover — never ship full galleries. */
function coverImageUrls(doc) {
  const cover = pickImage(doc);
  return cover ? [cover] : [];
}

function formatMineRealEstate(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: listingId(doc),
    title: doc.title,
    propertyCategory: doc.propertyCategory,
    transactionType: doc.transactionType,
    price: doc.price,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency,
    surfaceM2: doc.surfaceM2,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    condition: doc.condition ?? null,
    apartmentTypeSlug: doc.apartmentTypeSlug ?? null,
    floor: doc.floor ?? null,
    totalFloors: doc.totalFloors ?? null,
    parkingFloor: doc.parkingFloor ?? null,
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    furnishing: doc.furnishing ?? null,
    yearBuilt: doc.yearBuilt ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineCar(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vehicleType: doc.vehicleType || 'car',
    make: doc.make,
    model: doc.model,
    variant: doc.variant || '',
    year: doc.year,
    kilometers: doc.kilometers,
    transmission: doc.transmission,
    fuelType: doc.fuelType,
    price: doc.price,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency,
    color: doc.color,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineJob(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    title: doc.title,
    industry: doc.industry,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    education: doc.education,
    experience: doc.experience,
    jobType: doc.jobType,
    workLocation: doc.workLocation,
    salary: doc.salary ?? null,
    currency: doc.currency ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineMarketplace(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    transactionType: doc.transactionType,
    title: doc.title,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineBusiness(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: coverImageUrls(doc),
    servicesHighlight: doc.servicesHighlight ?? null,
    announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
    announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
    announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
    announcementAt: doc.announcementAt ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

function formatMineProfessional(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: coverImageUrls(doc),
    servicesHighlight: doc.servicesHighlight ?? null,
    announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
    announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
    announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
    announcementAt: doc.announcementAt ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

/** Full row for owner edit (includes galleries, descriptions, menus, etc.). */
function formatMineRealEstateFull(doc, cityById) {
  const city = cityById.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: listingId(doc),
    title: doc.title,
    description: doc.description ?? '',
    propertyCategory: doc.propertyCategory,
    transactionType: doc.transactionType,
    price: doc.price,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency,
    surfaceM2: doc.surfaceM2,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
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
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineCarFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vehicleType: doc.vehicleType || 'car',
    make: doc.make,
    model: doc.model,
    variant: doc.variant || '',
    description: doc.description ?? '',
    year: doc.year,
    kilometers: doc.kilometers,
    transmission: doc.transmission,
    fuelType: doc.fuelType,
    price: doc.price,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency,
    color: doc.color,
    finish: doc.finish ?? [],
    extras: doc.extras ?? [],
    contactPhone: doc.contactPhone ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineJobFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    title: doc.title,
    description: doc.description ?? '',
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
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineMarketplaceFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    transactionType: doc.transactionType,
    title: doc.title,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    originalPrice: doc.originalPrice ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    description: doc.description ?? '',
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
  };
}

function formatMineBusinessFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description ?? '',
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    openingHours: doc.openingHours ?? null,
    weeklyHours: Array.isArray(doc.weeklyHours) ? doc.weeklyHours : doc.weeklyHours ?? [],
    menuCategories: doc.menuCategories ?? [],
    menuItems: doc.menuItems ?? [],
    reservationsEnabled: Boolean(doc.reservationsEnabled),
    reservationUrl: doc.reservationUrl ?? null,
    reservationTimeSlots: doc.reservationTimeSlots ?? [],
    reservationPartySizes: doc.reservationPartySizes ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
    announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
    announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
    announcementAt: doc.announcementAt ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

function formatMineProfessionalFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description ?? '',
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    responseTimeHours: doc.responseTimeHours ?? null,
    portfolioItems: doc.portfolioItems ?? [],
    servicesHighlight: doc.servicesHighlight ?? null,
    announcementTitle: doc.announcementTitle?.replace(/\s+/g, ' ').trim() || null,
    announcementSubtitle: doc.announcementSubtitle?.replace(/\s+/g, ' ').trim() || null,
    announcementBannerUrl: doc.announcementBannerUrl?.trim() || null,
    announcementAt: doc.announcementAt ?? null,
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
  };
}

async function queryMineRows(table, posterId, { limit, extraEq } = {}) {
  const cap = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT_PER_KIND;
  // Prefer updated_at so refresh/premium bumps (which only touch created_at) do not
  // reshuffle the owner's dashboard. Fall back to created_at if the column is missing.
  let q = getSupabaseAdmin()
    .from(table)
    .select(MINE_SELECT[table] || '*')
    .eq('poster_id', posterId)
    .order('updated_at', { ascending: false })
    .limit(cap);
  if (extraEq) {
    for (const [col, val] of Object.entries(extraEq)) {
      q = q.eq(col, val);
    }
  }
  let { data, error } = await q;
  if (error && /updated_at/i.test(String(error.message || ''))) {
    q = getSupabaseAdmin()
      .from(table)
      .select(MINE_SELECT[table] || '*')
      .eq('poster_id', posterId)
      .order('created_at', { ascending: false })
      .limit(cap);
    if (extraEq) {
      for (const [col, val] of Object.entries(extraEq)) {
        q = q.eq(col, val);
      }
    }
    ({ data, error } = await q);
  }
  if (error) throw error;
  return camelizeRows(data);
}

async function loadMineKind(posterId, {
  table,
  metricKind,
  format,
  limit = DEFAULT_LIMIT_PER_KIND,
  extraEq,
}) {
  const docs = await queryMineRows(table, posterId, { limit, extraEq });
  const cityById = await buildCityIndex(docs);
  const listings = docs.map((d) => format(d, cityById));
  return attachOwnerMetrics(listings, metricKind);
}

/** Full single listing for owner edit (select * + fat formatter). */
async function loadMineListingById(posterId, {
  table,
  listingId: id,
  metricKind,
  format,
  extraEq,
}) {
  let q = getSupabaseAdmin()
    .from(table)
    .select('*')
    .eq('poster_id', posterId)
    .eq('id', id);
  if (extraEq) {
    for (const [col, val] of Object.entries(extraEq)) {
      q = q.eq(col, val);
    }
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const docs = camelizeRows([data]);
  const cityById = await buildCityIndex(docs);
  const listing = format(docs[0], cityById);
  const [withMetrics] = await attachOwnerMetrics([listing], metricKind);
  return withMetrics;
}

/**
 * Loads slim card payloads for every vertical owned by `posterId`.
 * @returns {{
 *   realEstate: object[],
 *   cars: object[],
 *   jobs: object[],
 *   marketplace: object[],
 *   businesses: object[],
 *   professionals: object[],
 * }}
 */
async function loadMineListingsForPoster(posterId, { limitPerKind = DEFAULT_LIMIT_PER_KIND } = {}) {
  const limit = limitPerKind;
  const [realEstate, cars, jobs, marketplace, businesses, professionals] = await Promise.all([
    loadMineKind(posterId, {
      table: 'real_estate_listings',
      metricKind: 'real-estate',
      format: formatMineRealEstate,
      limit,
    }),
    loadMineKind(posterId, {
      table: 'car_listings',
      metricKind: 'car',
      format: formatMineCar,
      limit,
    }),
    loadMineKind(posterId, {
      table: 'job_listings',
      metricKind: 'job',
      format: formatMineJob,
      limit,
    }),
    loadMineKind(posterId, {
      table: 'marketplace_listings',
      metricKind: 'marketplace',
      format: formatMineMarketplace,
      limit,
    }),
    loadMineKind(posterId, {
      table: 'directory_listings',
      metricKind: 'businesses',
      format: formatMineBusiness,
      limit,
      extraEq: { vertical: 'businesses' },
    }),
    loadMineKind(posterId, {
      table: 'directory_listings',
      metricKind: 'professionals',
      format: formatMineProfessional,
      limit,
      extraEq: { vertical: 'professionals' },
    }),
  ]);

  return { realEstate, cars, jobs, marketplace, businesses, professionals };
}

module.exports = {
  DEFAULT_LIMIT_PER_KIND,
  MINE_SELECT,
  coverImageUrls,
  formatMineRealEstate,
  formatMineCar,
  formatMineJob,
  formatMineMarketplace,
  formatMineBusiness,
  formatMineProfessional,
  formatMineRealEstateFull,
  formatMineCarFull,
  formatMineJobFull,
  formatMineMarketplaceFull,
  formatMineBusinessFull,
  formatMineProfessionalFull,
  loadMineKind,
  loadMineListingById,
  loadMineListingsForPoster,
};
