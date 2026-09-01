'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { camelizeRows } = require('./profiles');
const { attachOwnerMetrics } = require('./listing-metrics');
const { buildCityIndex, isJobListingActive } = require('./public-listings/query-helpers');
const { pickImage } = require('./public-listings/text-helpers');
const { premiumFieldsFromDoc } = require('./premium-listing');
const { okazionFieldsFromDoc } = require('./okazion-listing');
const { extractPlaceQueryFromMapsUrl } = require('./google-maps-location');
const { mapsJsonFromDoc } = require('./listing-maps-fields');

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
    'contact_phone',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
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
    'zone_id',
    'contact_phone',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
  ].join(','),
  job_listings: [
    'id',
    'title',
    'cover_mode',
    'industry',
    'city_id',
    'zone_id',
    'education',
    'experience',
    'job_type',
    'work_location',
    'preferred_gender',
    'preferred_age_min',
    'preferred_age_max',
    'salary',
    'currency',
    'contact_phone',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'bumped_at',
    'premium_until',
    'okazion_until',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
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
    'zone_id',
    'contact_phone',
    'image_urls',
    'status',
    'created_at',
    'updated_at',
    'premium_until',
    'okazion_until',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
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
    'zone_id',
    'maps_url',
    'location_lat',
    'location_lng',
    'location_address',
    'contact_phone',
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
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineCar(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
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
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineJob(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  const jobActive = isJobListingActive(doc);
  return {
    id: listingId(doc),
    title: doc.title,
    coverMode: doc.coverMode === 'mockup' ? 'mockup' : 'image',
    industry: doc.industry,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
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
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    bumpedAt: doc.bumpedAt ?? null,
    ...(jobActive
      ? { ...premiumFieldsFromDoc(doc), ...okazionFieldsFromDoc(doc) }
      : { isPremium: false, premiumUntil: null, isOkazion: false, okazionUntil: null }),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineMarketplace(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
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
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    imageUrls: coverImageUrls(doc),
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineBusiness(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  const lat =
    typeof doc.locationLat === 'number' ? doc.locationLat : doc.locationLat != null ? Number(doc.locationLat) : null;
  const lng =
    typeof doc.locationLng === 'number' ? doc.locationLng : doc.locationLng != null ? Number(doc.locationLng) : null;
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    mapsUrl: doc.mapsUrl?.trim() || null,
    mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
    locationAddress: doc.locationAddress?.trim() || null,
    locationLat: Number.isFinite(lat) ? lat : null,
    locationLng: Number.isFinite(lng) ? lng : null,
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
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    category: doc.category,
    condition: doc.condition ?? null,
    price: doc.price ?? null,
    currency: doc.currency ?? null,
    cityId: doc.cityId ? String(doc.cityId) : null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
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
    ...mapsJsonFromDoc(doc),
    mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
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
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineCarFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
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
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineJobFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: listingId(doc),
    title: doc.title,
    coverMode: doc.coverMode === 'mockup' ? 'mockup' : 'image',
    description: doc.description ?? '',
    industry: doc.industry,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
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
    responsibilities: doc.responsibilities ?? [],
    requirements: doc.requirements ?? [],
    requiredRoles: doc.requiredRoles ?? [],
    benefits: doc.benefits ?? [],
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineMarketplaceFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
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
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    contactPhone: doc.contactPhone ?? null,
    description: doc.description ?? '',
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    status: doc.status || 'pending',
    createdAt: doc.createdAt,
    ...premiumFieldsFromDoc(doc),
    ...okazionFieldsFromDoc(doc),
    ...mapsJsonFromDoc(doc),
  };
}

function formatMineBusinessFull(doc, cityById) {
  const city = cityById?.get(String(doc.cityId));
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
  return {
    id: listingId(doc),
    vertical: doc.vertical,
    title: doc.title,
    description: doc.description ?? '',
    category: doc.category,
    cityId: doc.cityId ? String(doc.cityId) : null,
    cityName: city?.name ?? null,
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    zoneName: zone?.name ?? null,
    mapsUrl: doc.mapsUrl?.trim() || null,
    mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
    locationAddress: doc.locationAddress?.trim() || null,
    locationLat:
      typeof doc.locationLat === 'number' ? doc.locationLat : doc.locationLat != null ? Number(doc.locationLat) : null,
    locationLng:
      typeof doc.locationLng === 'number' ? doc.locationLng : doc.locationLng != null ? Number(doc.locationLng) : null,
    contactPhone: doc.contactPhone ?? null,
    imageUrls: Array.isArray(doc.imageUrls) ? doc.imageUrls.filter(Boolean) : [],
    openingHours: doc.openingHours ?? null,
    weeklyHours: Array.isArray(doc.weeklyHours) ? doc.weeklyHours : (doc.weeklyHours ?? []),
    menuCategories: doc.menuCategories ?? [],
    menuItems: doc.menuItems ?? [],
    reservationsEnabled: Boolean(doc.reservationsEnabled),
    reservationUrl: doc.reservationUrl ?? null,
    mobileCtaMode: doc.mobileCtaMode === 'reserve' || doc.mobileCtaMode === 'none' ? doc.mobileCtaMode : 'contact',
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
  const zone = city?.zones?.find((z) => String(z.id) === String(doc.zoneId));
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
    zoneId: doc.zoneId ? String(doc.zoneId) : null,
    cityName: city?.name ?? null,
    zoneName: zone?.name ?? null,
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
    ...mapsJsonFromDoc(doc),
    mapsPlaceQuery: doc.mapsUrl ? extractPlaceQueryFromMapsUrl(doc.mapsUrl) : null,
  };
}

async function queryMineRows(table, posterId, { limit, extraEq } = {}) {
  const cap = Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT_PER_KIND;
  // Prefer updated_at so refresh/premium bumps (which only touch bumped_at) do not
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

async function loadMineKind(
  posterId,
  { table, metricKind, format, limit = DEFAULT_LIMIT_PER_KIND, extraEq, withMetrics = true }
) {
  const docs = await queryMineRows(table, posterId, { limit, extraEq });
  const cityById = await buildCityIndex(docs);
  const listings = docs.map((d) => format(d, cityById));
  if (!withMetrics) return listings;
  return attachOwnerMetrics(listings, metricKind);
}

/** Full single listing for owner edit (select * + fat formatter). */
async function loadMineListingById(posterId, { table, listingId: id, metricKind, format, extraEq }) {
  let q = getSupabaseAdmin().from(table).select('*').eq('poster_id', posterId).eq('id', id);
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
 * Metrics are attached in one cross-kind batch (not 6 separate round-trips).
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
      withMetrics: false,
    }),
    loadMineKind(posterId, {
      table: 'car_listings',
      metricKind: 'car',
      format: formatMineCar,
      limit,
      withMetrics: false,
    }),
    loadMineKind(posterId, {
      table: 'job_listings',
      metricKind: 'job',
      format: formatMineJob,
      limit,
      withMetrics: false,
    }),
    loadMineKind(posterId, {
      table: 'marketplace_listings',
      metricKind: 'marketplace',
      format: formatMineMarketplace,
      limit,
      withMetrics: false,
    }),
    loadMineKind(posterId, {
      table: 'directory_listings',
      metricKind: 'businesses',
      format: formatMineBusiness,
      limit,
      withMetrics: false,
      extraEq: { vertical: 'businesses' },
    }),
    loadMineKind(posterId, {
      table: 'directory_listings',
      metricKind: 'professionals',
      format: formatMineProfessional,
      limit,
      withMetrics: false,
      extraEq: { vertical: 'professionals' },
    }),
  ]);

  const { fetchMetricsMap, metricsKey, emptyMetrics } = require('./listing-metrics');
  const kindBuckets = [
    { kind: 'real-estate', listings: realEstate },
    { kind: 'car', listings: cars },
    { kind: 'job', listings: jobs },
    { kind: 'marketplace', listings: marketplace },
    { kind: 'businesses', listings: businesses },
    { kind: 'professionals', listings: professionals },
  ];
  const refs = kindBuckets.flatMap(({ kind, listings }) => listings.map((l) => ({ kind, listingId: l.id })));
  const map = await fetchMetricsMap(refs);
  for (const { kind, listings } of kindBuckets) {
    for (const listing of listings) {
      const m = map.get(metricsKey(kind, listing.id)) ?? emptyMetrics();
      listing.viewCount = m.viewCount;
      listing.shareCount = m.shareCount;
      listing.saveCount = m.saveCount;
    }
  }

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
