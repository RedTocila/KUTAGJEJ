import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { BUSINESS_CATEGORY_OPTIONS } from '@/lib/business-constants';
import type { BusinessMineListing, ProfessionalMineListing } from '@/lib/directory-listings-client';
import { extractPlaceQueryFromMapsUrl } from '@/lib/google-maps-location';
import { isPersistableImageUrl } from '@/lib/image-url';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import type { CarMineListing, JobMineListing, MarketplaceMineListing } from '@/lib/listings-client';
import { PROFESSIONAL_CATEGORY_OPTIONS } from '@/lib/professional-constants';
import type {
  PublicCarListingDetail,
  PublicDirectoryListingDetail,
  PublicJobListingDetail,
  PublicMarketplaceListingDetail,
  PublicRealEstateListingDetail,
} from '@/lib/public-listings-client';
import { findOptionLabel } from '@/components/public/listing-cards/format-helpers';

function durableUrls(urls: string[] | null | undefined): string[] {
  return (urls ?? []).filter(isPersistableImageUrl);
}

function metricsFrom(mine: { viewCount?: number; shareCount?: number; saveCount?: number; saved?: boolean }) {
  return {
    viewCount: mine.viewCount ?? 0,
    shareCount: mine.shareCount ?? 0,
    saveCount: mine.saveCount ?? 0,
    saved: mine.saved,
  };
}

function bumpFrom(mine: { createdAt: string; bumpedAt?: string | null }) {
  return {
    createdAt: mine.createdAt,
    bumpedAt: mine.bumpedAt ?? mine.createdAt,
  };
}

export function professionalMineToPublic(mine: ProfessionalMineListing): PublicDirectoryListingDetail {
  return {
    id: mine.id,
    kind: 'professionals',
    title: mine.title,
    description: mine.description ?? '',
    category: mine.category,
    categoryLabel: findOptionLabel(PROFESSIONAL_CATEGORY_OPTIONS, mine.category),
    condition: mine.condition,
    price: mine.price,
    currency: mine.currency === 'EUR' || mine.currency === 'LEK' ? mine.currency : null,
    cityName: mine.cityName,
    zoneName: mine.zoneName ?? null,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    ...bumpFrom(mine),
    updatedAt: mine.updatedAt ?? mine.createdAt,
    openingHours: null,
    openStatusLine: null,
    ratingAverage: null,
    reviewCount: 0,
    reservationsEnabled: false,
    reservationUrl: null,
    mapsUrl: mine.mapsUrl ?? null,
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    servicesHighlight: mine.servicesHighlight,
    responseTimeHours: mine.responseTimeHours ?? null,
    portfolioItems: (mine.portfolioItems ?? []).filter((p) => isPersistableImageUrl(p.imageUrl)),
    seller: null,
    ...metricsFrom(mine),
  };
}

export function businessMineToPublic(mine: BusinessMineListing): PublicDirectoryListingDetail {
  return {
    id: mine.id,
    kind: 'businesses',
    title: mine.title,
    description: mine.description ?? '',
    category: mine.category,
    categoryLabel: findOptionLabel(BUSINESS_CATEGORY_OPTIONS, mine.category),
    condition: null,
    price: null,
    currency: null,
    cityName: mine.cityName,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    ...bumpFrom(mine),
    updatedAt: mine.updatedAt ?? mine.createdAt,
    openingHours: mine.openingHours ?? null,
    openStatusLine: null,
    ratingAverage: null,
    reviewCount: 0,
    reservationsEnabled: Boolean(mine.reservationsEnabled),
    reservationUrl: mine.reservationUrl ?? null,
    mobileCtaMode: mine.mobileCtaMode ?? 'contact',
    zoneId: mine.zoneId ?? null,
    zoneName: mine.zoneName ?? null,
    mapsUrl: mine.mapsUrl ?? null,
    mapsPlaceQuery: mine.mapsPlaceQuery ?? (mine.mapsUrl ? extractPlaceQueryFromMapsUrl(mine.mapsUrl) : null),
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    servicesHighlight: mine.servicesHighlight,
    weeklyHours: mine.weeklyHours,
    menuCategories: mine.menuCategories,
    menuItems: mine.menuItems,
    reservationTimeSlots: mine.reservationTimeSlots,
    reservationPartySizes: mine.reservationPartySizes,
    seller: null,
    ...metricsFrom(mine),
  };
}

export function realEstateMineToPublic(mine: RealEstateMineListing): PublicRealEstateListingDetail {
  return {
    id: mine.id,
    kind: 'real-estate',
    title: mine.title,
    description: mine.description ?? '',
    propertyCategory: mine.propertyCategory,
    transactionType: mine.transactionType,
    price: mine.price,
    currency: mine.currency,
    surfaceM2: mine.surfaceM2,
    cityName: mine.cityName,
    zoneName: mine.zoneName,
    bedrooms: mine.bedrooms,
    bathrooms: mine.bathrooms,
    floor: mine.floor,
    totalFloors: mine.totalFloors,
    parkingFloor: mine.parkingFloor,
    apartmentTypeSlug: mine.apartmentTypeSlug,
    furnishing: mine.furnishing,
    yearBuilt: mine.yearBuilt,
    condition: mine.condition,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    mapsUrl: mine.mapsUrl ?? null,
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    ...bumpFrom(mine),
    updatedAt: mine.updatedAt ?? mine.createdAt,
    seller: null,
    ...metricsFrom(mine),
  };
}

export function carMineToPublic(mine: CarMineListing): PublicCarListingDetail {
  const title = [mine.make, mine.model, mine.variant].filter(Boolean).join(' ').trim() || 'Makina';
  return {
    id: mine.id,
    kind: 'car',
    title,
    description: mine.description ?? '',
    vehicleType: mine.vehicleType || 'car',
    make: mine.make,
    model: mine.model,
    variant: mine.variant,
    year: mine.year,
    kilometers: mine.kilometers,
    transmission: (mine.transmission === 'automatic' || mine.transmission === 'manual'
      ? mine.transmission
      : 'manual') as 'automatic' | 'manual',
    fuelType: mine.fuelType,
    price: mine.price,
    currency: mine.currency === 'EUR' || mine.currency === 'LEK' ? mine.currency : 'EUR',
    color: mine.color,
    finish: mine.finish ?? [],
    extras: mine.extras ?? [],
    cityName: mine.cityName,
    zoneName: mine.zoneName ?? null,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    mapsUrl: mine.mapsUrl ?? null,
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    ...bumpFrom(mine),
    updatedAt: mine.createdAt,
    seller: null,
    ...metricsFrom(mine),
  };
}

export function jobMineToPublic(mine: JobMineListing): PublicJobListingDetail {
  const expires = getJobListingExpiresAt(mine.createdAt, mine.bumpedAt);
  const workLocation =
    mine.workLocation === 'hybrid' || mine.workLocation === 'remote' || mine.workLocation === 'onsite'
      ? mine.workLocation
      : 'onsite';
  return {
    id: mine.id,
    kind: 'job',
    title: mine.title,
    description: mine.description ?? '',
    coverMode: mine.coverMode === 'mockup' ? 'mockup' : 'image',
    industry: mine.industry,
    cityName: mine.cityName,
    zoneName: mine.zoneName ?? null,
    education: mine.education,
    experience: mine.experience,
    jobType: mine.jobType,
    workLocation,
    preferredGender:
      mine.preferredGender === 'male' || mine.preferredGender === 'female' || mine.preferredGender === 'both'
        ? mine.preferredGender
        : null,
    preferredAgeMin: mine.preferredAgeMin ?? null,
    preferredAgeMax: mine.preferredAgeMax ?? null,
    salary: mine.salary,
    currency: mine.currency === 'EUR' || mine.currency === 'LEK' ? mine.currency : null,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    mapsUrl: mine.mapsUrl ?? null,
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    ...bumpFrom(mine),
    updatedAt: mine.createdAt,
    expiresAt: expires.toISOString(),
    responsibilities: mine.responsibilities ?? [],
    requirements: mine.requirements ?? [],
    benefits: mine.benefits ?? [],
    seller: null,
    ...metricsFrom(mine),
  };
}

export function marketplaceMineToPublic(mine: MarketplaceMineListing): PublicMarketplaceListingDetail {
  return {
    id: mine.id,
    kind: 'marketplace',
    transactionType: 'shes',
    title: mine.title,
    description: mine.description ?? '',
    category: mine.category,
    condition: mine.condition,
    price: mine.price,
    currency: mine.currency === 'EUR' || mine.currency === 'LEK' ? mine.currency : null,
    cityName: mine.cityName,
    zoneName: mine.zoneName ?? null,
    contactPhone: mine.contactPhone ?? null,
    imageUrl: durableUrls(mine.imageUrls)[0] ?? null,
    imageUrls: durableUrls(mine.imageUrls),
    mapsUrl: mine.mapsUrl ?? null,
    locationAddress: mine.locationAddress ?? null,
    locationLat: mine.locationLat ?? null,
    locationLng: mine.locationLng ?? null,
    ...bumpFrom(mine),
    updatedAt: mine.createdAt,
    seller: null,
    ...metricsFrom(mine),
  };
}
