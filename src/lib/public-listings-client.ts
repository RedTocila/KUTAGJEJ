import { cache } from 'react';

import type { HomeVerticalId } from '@/lib/home-categories';
import type { BrowseFilters, BrowseOkazionFilters } from '@/lib/listing-filters';
import { BROWSE_PAGE_SIZE, buildBrowseApiQuery } from '@/lib/listing-filters';
import type { ListingMetrics } from '@/lib/listing-metrics';
import { isListingId } from '@/lib/real-estate-permalink';
import { loadPublicEntity, safeServerJson, type PublicEntityLoadResult } from '@/lib/server-fetch';

export type { PublicEntityLoadResult };

export type ListingMetricsFields = ListingMetrics & {
  /** Active Premium boost window — listing floats to the top of public feeds. */
  isPremium?: boolean;
  premiumUntil?: string | null;
  /** Active OKAZION window — red-themed short deal (5 days). */
  isOkazion?: boolean;
  okazionUntil?: string | null;
  /** Last refresh / premium / okazion / announce bump — drives “newest” + card footer time. */
  bumpedAt?: string | null;
  /** Poster has an approved account verification badge. */
  sellerVerified?: boolean;
  /** Poster has an active Grow or Elite package (Premium Badge stamp on titles). */
  sellerTrustBadge?: boolean;
};

/**
 * Server-friendly client for the platform's public listing endpoints.
 *
 * Designed to be safely callable from both Server Components (during SSR) and
 * Client Components. Returns empty arrays on failure so the UI can always
 * render — perfect for early-stage deployments where the API may be cold or
 * a vertical may have no listings yet.
 */

export interface PublicRealEstateListing extends ListingMetricsFields {
  id: string;
  kind: 'real-estate';
  title: string;
  description: string;
  propertyCategory: string;
  transactionType: 'rent' | 'sale';
  price: number;
  /** Optional previous (“was”) price — shown struck when higher than `price`. */
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK';
  surfaceM2: number;
  cityName: string | null;
  zoneName: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  furnishing: string | null;
  yearBuilt: number | null;
  condition: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  /** SEO path segment: `{slug}-{mongoId}.html` — use with `/prona/`. Omit if API lagging. */
  permalinkPath?: string;
}

export interface PublicRealEstateListingSeller {
  id?: string;
  kind: 'individual' | 'business';
  displayName: string | null;
  phone: string | null;
  /** Public profile photo URL when the member has uploaded one. */
  avatarUrl?: string | null;
  memberSince: string;
  /** Admin-approved verification (jobs and/or professionals, depending on context). */
  verified?: boolean;
  /** Active Grow or Elite package — Premium Badge stamp on titles. */
  trustBadge?: boolean;
  /** Business accounts — registered owner name. */
  businessOwner?: string | null;
  /** Business accounts — free-text category. */
  businessCategory?: string | null;
  /**
   * Aggregate rating from business/professional listing reviews.
   * Same review pool that feeds the Trusted referral badge.
   */
  ratingAverage?: number | null;
  /** Total reviews received across directory listings. */
  reviewCount?: number;
}

export interface JobListingBenefit {
  id: string;
  label: string;
}

/** Single listing for `/prona/{permalink}` — full description, seller summary. */
export interface PublicRealEstateListingDetail extends ListingMetricsFields {
  id: string;
  kind: 'real-estate';
  title: string;
  description: string;
  propertyCategory: string;
  transactionType: 'rent' | 'sale';
  price: number;
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK';
  surfaceM2: number;
  cityName: string | null;
  zoneName: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  parkingFloor: number | null;
  apartmentTypeSlug: string | null;
  furnishing: string | null;
  yearBuilt: number | null;
  condition: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  seller: PublicRealEstateListingSeller | null;
  permalinkPath?: string;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

export interface PublicCarListing extends ListingMetricsFields {
  id: string;
  kind: 'car';
  description: string;
  vehicleType?: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  kilometers: number;
  transmission: 'automatic' | 'manual';
  fuelType: string;
  price: number;
  /** Optional previous (“was”) price — shown struck when higher than `price`. */
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK';
  color: string;
  cityName: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  permalinkPath?: string;
}

export interface PublicCarListingDetail extends Omit<PublicCarListing, 'description'> {
  description: string;
  title: string;
  extras: string[];
  finish?: string[];
  seller: PublicRealEstateListingSeller | null;
  updatedAt: string;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

export interface PublicJobListing extends ListingMetricsFields {
  id: string;
  kind: 'job';
  title: string;
  description: string;
  industry: string;
  cityName: string | null;
  education: string;
  experience: string;
  jobType: string;
  workLocation: 'onsite' | 'hybrid' | 'remote';
  salary: number | null;
  currency: 'EUR' | 'LEK' | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  /** ISO timestamp when the listing is removed from public browse (15 days after posting). */
  expiresAt: string;
  permalinkPath?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: JobListingBenefit[];
}

/** Full job listing for `/pune/[permalink]`. */
export interface PublicJobListingDetail extends Omit<PublicJobListing, 'description'> {
  description: string;
  seller: PublicRealEstateListingSeller | null;
  updatedAt: string;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

export interface PublicMarketplaceListing extends ListingMetricsFields {
  id: string;
  kind: 'marketplace';
  transactionType: 'shes';
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  /** Optional previous (“was”) price — shown struck when higher than `price`. */
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK' | null;
  cityName: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  permalinkPath?: string;
}

/** Full marketplace listing for `/tregu/[permalink]`. */
export interface PublicMarketplaceListingDetail extends Omit<PublicMarketplaceListing, 'description'> {
  description: string;
  seller: PublicRealEstateListingSeller | null;
  updatedAt: string;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
}

export interface PublicDirectoryListing extends ListingMetricsFields {
  id: string;
  kind: 'businesses' | 'professionals';
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  condition: string | null;
  price: number | null;
  currency: 'EUR' | 'LEK' | null;
  cityName: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  permalinkPath?: string;
  /** Biznese venues only — opening times as plain text. */
  openingHours: string | null;
  /** Computed open/closed line for detail header. */
  openStatusLine?: string | null;
  ratingAverage?: number | null;
  reviewCount?: number;
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  /** Biznese — primary mobile CTA above summary. */
  mobileCtaMode?: 'contact' | 'reserve' | 'none';
  /** Neighbourhood within city (reuses real-estate zones). */
  zoneId?: string | null;
  zoneName?: string | null;
  /** Pasted Google Maps share URL. */
  mapsUrl?: string | null;
  /** Place name extracted from Maps URL for display. */
  mapsPlaceQuery?: string | null;
  /** Street / road / neighbourhood from the Maps pin. */
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  /** Short “what we offer” line for venues. */
  servicesHighlight: string | null;
  /** Business / professional announcement promo (title required when active). */
  announcementTitle?: string | null;
  announcementSubtitle?: string | null;
  announcementBannerUrl?: string | null;
  /** Profesionistë — typical response time (hours). */
  responseTimeHours?: number | null;
}

export type PublicBusinessMenuCategory = { id: string; name: string; sortOrder: number };
export type PublicProfessionalPortfolioItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string | null;
  sortOrder: number;
};

export type PublicBusinessMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR' | 'LEK';
  imageUrl: string | null;
  sortOrder: number;
};

/** Full Biznese / Profesionistë listing detail. */
export interface PublicDirectoryListingDetail extends Omit<PublicDirectoryListing, 'description'> {
  description: string;
  seller: PublicRealEstateListingSeller | null;
  updatedAt: string;
  weeklyHours?: { dayOfWeek: number; closed: boolean; open: string | null; close: string | null }[];
  menuCategories?: PublicBusinessMenuCategory[];
  menuItems?: PublicBusinessMenuItem[];
  reservationTimeSlots?: string[];
  reservationPartySizes?: number[];
  portfolioItems?: PublicProfessionalPortfolioItem[];
}

export type AnyPublicListingDetail =
  | PublicCarListingDetail
  | PublicJobListingDetail
  | PublicMarketplaceListingDetail
  | PublicDirectoryListingDetail;

/** OKAZION applies to sellable ads only — not businesses / professionals. */
export type PublicOkazionListing =
  | PublicRealEstateListing
  | PublicCarListing
  | PublicJobListing
  | PublicMarketplaceListing;

export interface PublicListingsBundle {
  realEstate: PublicRealEstateListing[];
  cars: PublicCarListing[];
  jobs: PublicJobListing[];
  marketplace: PublicMarketplaceListing[];
  businesses: PublicDirectoryListing[];
  professionals: PublicDirectoryListing[];
  okazion: PublicOkazionListing[];
  okazionTotal: number;
  totals: {
    realEstate: number;
    cars: number;
    jobs: number;
    marketplace: number;
    businesses: number;
    professionals: number;
  };
}

async function safeJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  return safeServerJson<T>(path, init);
}

const EMPTY_BUNDLE: PublicListingsBundle = {
  realEstate: [],
  cars: [],
  jobs: [],
  marketplace: [],
  businesses: [],
  professionals: [],
  okazion: [],
  okazionTotal: 0,
  totals: { realEstate: 0, cars: 0, jobs: 0, marketplace: 0, businesses: 0, professionals: 0 },
};

export async function fetchHomepageListings(limit = 8): Promise<PublicListingsBundle & { ok: boolean }> {
  const data = await safeJson<PublicListingsBundle>(`/public/listings/latest?limit=${limit}`);
  if (!data) return { ...EMPTY_BUNDLE, ok: false };
  return {
    realEstate: data.realEstate ?? [],
    cars: data.cars ?? [],
    jobs: data.jobs ?? [],
    marketplace: data.marketplace ?? [],
    businesses: data.businesses ?? [],
    professionals: data.professionals ?? [],
    okazion: data.okazion ?? [],
    okazionTotal: data.okazionTotal ?? 0,
    totals: data.totals ?? EMPTY_BUNDLE.totals,
    ok: true,
  };
}

/** Slim first-row payload — no OKAZION, no exact category counts. */
export const fetchHomepageRecommended = cache(async function fetchHomepageRecommended(
  limit = 8
): Promise<PublicListingsBundle & { ok: boolean }> {
  const data = await safeJson<Pick<
    PublicListingsBundle,
    'realEstate' | 'cars' | 'jobs' | 'marketplace' | 'businesses' | 'professionals'
  >>(`/public/listings/recommended?limit=${limit}`);
  if (!data) return { ...EMPTY_BUNDLE, ok: false };
  return {
    realEstate: data.realEstate ?? [],
    cars: data.cars ?? [],
    jobs: data.jobs ?? [],
    marketplace: data.marketplace ?? [],
    businesses: data.businesses ?? [],
    professionals: data.professionals ?? [],
    okazion: [],
    okazionTotal: 0,
    totals: EMPTY_BUNDLE.totals,
    ok: true,
  };
});

export type HomepageLatestVerticalId = 'real-estate' | 'cars' | 'jobs' | 'marketplace' | 'businesses' | 'professionals';

export async function fetchLatestVertical<T = unknown>(
  vertical: HomepageLatestVerticalId,
  limit = 8
): Promise<{ listings: T[]; total: number; vertical: string; ok: boolean }> {
  const data = await safeJson<{ listings?: T[]; total?: number; vertical?: string }>(
    `/public/listings/latest/${vertical}?limit=${limit}`
  );
  if (!data) {
    return { listings: [], total: 0, vertical, ok: false };
  }
  return {
    listings: data.listings ?? [],
    total: data.total ?? 0,
    vertical: data.vertical ?? vertical,
    ok: true,
  };
}

export interface BrowseListingsResult<T> {
  listings: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** False when the API request failed (vs a real empty result). */
  ok: boolean;
}

export async function fetchBrowseRealEstate(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicRealEstateListing>> {
  const data = await safeJson<{
    listings: PublicRealEstateListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/real-estate${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

function parseBrowseResult<T>(
  data: {
    listings?: T[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  } | null,
  limit: number,
  page: number
): BrowseListingsResult<T> {
  if (!data) {
    return { listings: [], total: 0, page, limit, totalPages: 1, ok: false };
  }
  const listings = data.listings ?? [];
  const total = data.total ?? listings.length;
  const resolvedLimit = data.limit ?? limit;
  return {
    listings,
    total,
    page: data.page ?? page,
    limit: resolvedLimit,
    totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / resolvedLimit)),
    ok: true,
  };
}

export async function fetchBrowseCars(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicCarListing>> {
  const data = await safeJson<{
    listings: PublicCarListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/cars${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

export async function fetchBrowseJobs(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicJobListing>> {
  const data = await safeJson<{
    listings: PublicJobListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/jobs${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

export async function fetchBrowseMarketplace(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicMarketplaceListing>> {
  const data = await safeJson<{
    listings: PublicMarketplaceListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/marketplace${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

export async function fetchBrowseBusinesses(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicDirectoryListing>> {
  const data = await safeJson<{
    listings: PublicDirectoryListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/businesses${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

export async function fetchBrowseProfessionals(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicDirectoryListing>> {
  const data = await safeJson<{
    listings: PublicDirectoryListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/professionals${buildBrowseApiQuery(filters, limit, page)}`);
  return parseBrowseResult(data, limit, page);
}

export async function fetchBrowseOkazion(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseOkazionFilters = {},
  page = 1
): Promise<BrowseListingsResult<PublicOkazionListing>> {
  const q = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  if (filters.kind) q.set('kind', filters.kind);
  if (filters.q?.trim()) q.set('q', filters.q.trim());
  const data = await safeJson<{
    listings: PublicOkazionListing[];
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(`/public/listings/okazion?${q.toString()}`);
  return parseBrowseResult(data, limit, page);
}

export const fetchLatestRealEstate = cache(async function fetchLatestRealEstate(
  limit = 12
): Promise<PublicRealEstateListing[]> {
  const { listings } = await fetchBrowseRealEstate(limit);
  return listings;
});

export const fetchLatestCars = cache(async function fetchLatestCars(limit = 12): Promise<PublicCarListing[]> {
  const { listings } = await fetchBrowseCars(limit);
  return listings;
});

export const fetchLatestJobs = cache(async function fetchLatestJobs(limit = 12): Promise<PublicJobListing[]> {
  const { listings } = await fetchBrowseJobs(limit);
  return listings;
});

export const fetchLatestMarketplace = cache(async function fetchLatestMarketplace(
  limit = 12
): Promise<PublicMarketplaceListing[]> {
  const { listings } = await fetchBrowseMarketplace(limit);
  return listings;
});

export const fetchLatestBusinesses = cache(async function fetchLatestBusinesses(
  limit = 12
): Promise<PublicDirectoryListing[]> {
  const { listings } = await fetchBrowseBusinesses(limit);
  return listings;
});

export const fetchLatestProfessionals = cache(async function fetchLatestProfessionals(
  limit = 12
): Promise<PublicDirectoryListing[]> {
  const { listings } = await fetchBrowseProfessionals(limit);
  return listings;
});

export const TOP_VIEWED_LIMIT = 10;

export type TopViewedListing =
  | PublicRealEstateListing
  | PublicCarListing
  | PublicJobListing
  | PublicMarketplaceListing
  | PublicDirectoryListing;

/** Featured listings for a category page slider (max 10). Views for commerce; ratings for businesses/professionals. */
export async function fetchTopViewedListings(
  verticalId: HomeVerticalId,
  limit = TOP_VIEWED_LIMIT
): Promise<TopViewedListing[]> {
  const capped = Math.min(Math.max(1, limit), TOP_VIEWED_LIMIT);
  const data = await safeJson<{ listings?: TopViewedListing[] }>(
    `/public/listings/top-viewed?vertical=${encodeURIComponent(verticalId)}&limit=${capped}`
  );
  return data?.listings ?? [];
}

function pickListing<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null;
  const listing = (payload as { listing?: T }).listing;
  return listing ?? null;
}

export const loadPublicRealEstateListingById = cache(async function loadPublicRealEstateListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicRealEstateListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicRealEstateListingDetail>(
    `/public/listings/real-estate/${encodeURIComponent(raw)}`,
    pickListing<PublicRealEstateListingDetail>
  );
});

export async function fetchPublicRealEstateListingById(id: string): Promise<PublicRealEstateListingDetail | null> {
  return (await loadPublicRealEstateListingById(id)).data;
}

export const loadPublicCarListingById = cache(async function loadPublicCarListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicCarListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicCarListingDetail>(
    `/public/listings/cars/${encodeURIComponent(raw)}`,
    pickListing<PublicCarListingDetail>
  );
});

export async function fetchPublicCarListingById(id: string): Promise<PublicCarListingDetail | null> {
  return (await loadPublicCarListingById(id)).data;
}

export const loadPublicJobListingById = cache(async function loadPublicJobListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicJobListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicJobListingDetail>(
    `/public/listings/jobs/${encodeURIComponent(raw)}`,
    pickListing<PublicJobListingDetail>
  );
});

export async function fetchPublicJobListingById(id: string): Promise<PublicJobListingDetail | null> {
  return (await loadPublicJobListingById(id)).data;
}

export const loadPublicMarketplaceListingById = cache(async function loadPublicMarketplaceListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicMarketplaceListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicMarketplaceListingDetail>(
    `/public/listings/marketplace/${encodeURIComponent(raw)}`,
    pickListing<PublicMarketplaceListingDetail>
  );
});

export async function fetchPublicMarketplaceListingById(id: string): Promise<PublicMarketplaceListingDetail | null> {
  return (await loadPublicMarketplaceListingById(id)).data;
}

export const loadPublicBusinessListingById = cache(async function loadPublicBusinessListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicDirectoryListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicDirectoryListingDetail>(
    `/public/listings/businesses/${encodeURIComponent(raw)}`,
    pickListing<PublicDirectoryListingDetail>,
    {
      cache: 'no-store',
    }
  );
});

export async function fetchPublicBusinessListingById(id: string): Promise<PublicDirectoryListingDetail | null> {
  return (await loadPublicBusinessListingById(id)).data;
}

export const loadPublicProfessionalListingById = cache(async function loadPublicProfessionalListingById(
  id: string
): Promise<PublicEntityLoadResult<PublicDirectoryListingDetail>> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!isListingId(raw)) return { data: null, unavailable: false };
  return loadPublicEntity<PublicDirectoryListingDetail>(
    `/public/listings/professionals/${encodeURIComponent(raw)}`,
    pickListing<PublicDirectoryListingDetail>,
    {
      cache: 'no-store',
    }
  );
});

export async function fetchPublicProfessionalListingById(id: string): Promise<PublicDirectoryListingDetail | null> {
  return (await loadPublicProfessionalListingById(id)).data;
}
