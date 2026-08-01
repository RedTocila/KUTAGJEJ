import type { ListingMetrics } from '@/lib/listing-metrics';
import type { BrowseFilters } from '@/lib/listing-filters';
import { BROWSE_PAGE_SIZE, buildBrowseApiQuery } from '@/lib/listing-filters';
import type { HomeVerticalId } from '@/lib/home-categories';
import { safeServerJson } from '@/lib/server-fetch';

export type ListingMetricsFields = ListingMetrics;

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
  memberSince: string;
  /** Admin-approved verification (jobs and/or professionals, depending on context). */
  verified?: boolean;
  /** Business accounts — registered owner name. */
  businessOwner?: string | null;
  /** Business accounts — free-text category. */
  businessCategory?: string | null;
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
}

export interface PublicCarListing extends ListingMetricsFields {
  id: string;
  kind: 'car';
  description: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  kilometers: number;
  transmission: 'automatic' | 'manual';
  fuelType: string;
  price: number;
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
  /** Short “what we offer” line for venues. */
  servicesHighlight: string | null;
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

export interface PublicListingsBundle {
  realEstate: PublicRealEstateListing[];
  cars: PublicCarListing[];
  jobs: PublicJobListing[];
  marketplace: PublicMarketplaceListing[];
  businesses: PublicDirectoryListing[];
  professionals: PublicDirectoryListing[];
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
  totals: { realEstate: 0, cars: 0, jobs: 0, marketplace: 0, businesses: 0, professionals: 0 },
};

export async function fetchHomepageListings(limit = 8): Promise<PublicListingsBundle> {
  const data = await safeJson<PublicListingsBundle>(`/public/listings/latest?limit=${limit}`);
  if (!data) return EMPTY_BUNDLE;
  return {
    realEstate: data.realEstate ?? [],
    cars: data.cars ?? [],
    jobs: data.jobs ?? [],
    marketplace: data.marketplace ?? [],
    businesses: data.businesses ?? [],
    professionals: data.professionals ?? [],
    totals: data.totals ?? EMPTY_BUNDLE.totals,
  };
}

export interface BrowseListingsResult<T> {
  listings: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchBrowseRealEstate(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1,
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
  page: number,
): BrowseListingsResult<T> {
  const listings = data?.listings ?? [];
  const total = data?.total ?? listings.length;
  const resolvedLimit = data?.limit ?? limit;
  return {
    listings,
    total,
    page: data?.page ?? page,
    limit: resolvedLimit,
    totalPages: data?.totalPages ?? Math.max(1, Math.ceil(total / resolvedLimit)),
  };
}

export async function fetchBrowseCars(
  limit = BROWSE_PAGE_SIZE,
  filters: BrowseFilters = {},
  page = 1,
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
  page = 1,
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
  page = 1,
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
  page = 1,
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
  page = 1,
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

export async function fetchLatestRealEstate(limit = 12): Promise<PublicRealEstateListing[]> {
  const { listings } = await fetchBrowseRealEstate(limit);
  return listings;
}

export async function fetchLatestCars(limit = 12): Promise<PublicCarListing[]> {
  const { listings } = await fetchBrowseCars(limit);
  return listings;
}

export async function fetchLatestJobs(limit = 12): Promise<PublicJobListing[]> {
  const { listings } = await fetchBrowseJobs(limit);
  return listings;
}

export async function fetchLatestMarketplace(limit = 12): Promise<PublicMarketplaceListing[]> {
  const { listings } = await fetchBrowseMarketplace(limit);
  return listings;
}

export async function fetchLatestBusinesses(limit = 12): Promise<PublicDirectoryListing[]> {
  const { listings } = await fetchBrowseBusinesses(limit);
  return listings;
}

export async function fetchLatestProfessionals(limit = 12): Promise<PublicDirectoryListing[]> {
  const { listings } = await fetchBrowseProfessionals(limit);
  return listings;
}

export const TOP_VIEWED_LIMIT = 10;

export type TopViewedListing =
  | PublicRealEstateListing
  | PublicCarListing
  | PublicJobListing
  | PublicMarketplaceListing
  | PublicDirectoryListing;

/** Most-viewed listings for a public category page slider (max 10). */
export async function fetchTopViewedListings(
  verticalId: HomeVerticalId,
  limit = TOP_VIEWED_LIMIT,
): Promise<TopViewedListing[]> {
  const capped = Math.min(Math.max(1, limit), TOP_VIEWED_LIMIT);
  const data = await safeJson<{ listings?: TopViewedListing[] }>(
    `/public/listings/top-viewed?vertical=${encodeURIComponent(verticalId)}&limit=${capped}`,
  );
  return data?.listings ?? [];
}

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export async function fetchPublicRealEstateListingById(id: string): Promise<PublicRealEstateListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicRealEstateListingDetail }>(
    `/public/listings/real-estate/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}

export async function fetchPublicCarListingById(id: string): Promise<PublicCarListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicCarListingDetail }>(
    `/public/listings/cars/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}

export async function fetchPublicJobListingById(id: string): Promise<PublicJobListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicJobListingDetail }>(
    `/public/listings/jobs/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}

export async function fetchPublicMarketplaceListingById(id: string): Promise<PublicMarketplaceListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicMarketplaceListingDetail }>(
    `/public/listings/marketplace/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}

export async function fetchPublicBusinessListingById(id: string): Promise<PublicDirectoryListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicDirectoryListingDetail }>(
    `/public/listings/businesses/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}

export async function fetchPublicProfessionalListingById(id: string): Promise<PublicDirectoryListingDetail | null> {
  const raw = typeof id === 'string' ? id.trim() : '';
  if (!OBJECT_ID_RE.test(raw)) return null;
  const data = await safeJson<{ listing?: PublicDirectoryListingDetail }>(
    `/public/listings/professionals/${encodeURIComponent(raw)}`,
  );
  return data?.listing ?? null;
}