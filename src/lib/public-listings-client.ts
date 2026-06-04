import type { ListingMetrics } from '@/lib/listing-metrics';

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
  kind: 'individual' | 'business';
  displayName: string | null;
  phone: string | null;
  memberSince: string;
  /** Punë — admin-approved employer profile. */
  verified?: boolean;
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

/** Resolve the API base URL for both server and browser execution. */
function apiBase(): string {
  // On the server we can also accept an internal-only URL via API_URL.
  const fromServer = typeof process !== 'undefined' ? process.env.API_URL : undefined;
  const fromPublic = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  return (fromServer && fromServer.trim()) || (fromPublic && fromPublic.trim()) || 'http://localhost:5000';
}

/**
 * Cheap, resilient JSON fetch.
 * - 4 second timeout so a stalled API never blocks a SSR render.
 * - Always returns an object; never throws.
 */
async function safeJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
  try {
    const res = await fetch(`${apiBase()}/api${path}`, {
      ...init,
      // Lightly cached on the server so a refresh doesn't hammer Mongo.
      next: { revalidate: 60 },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
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

export async function fetchLatestRealEstate(limit = 12): Promise<PublicRealEstateListing[]> {
  const data = await safeJson<{ listings: PublicRealEstateListing[] }>(
    `/public/listings/real-estate?limit=${limit}`,
  );
  return data?.listings ?? [];
}

export async function fetchLatestCars(limit = 12): Promise<PublicCarListing[]> {
  const data = await safeJson<{ listings: PublicCarListing[] }>(`/public/listings/cars?limit=${limit}`);
  return data?.listings ?? [];
}

export async function fetchLatestJobs(limit = 12): Promise<PublicJobListing[]> {
  const data = await safeJson<{ listings: PublicJobListing[] }>(`/public/listings/jobs?limit=${limit}`);
  return data?.listings ?? [];
}

export async function fetchLatestMarketplace(limit = 12): Promise<PublicMarketplaceListing[]> {
  const data = await safeJson<{ listings: PublicMarketplaceListing[] }>(
    `/public/listings/marketplace?limit=${limit}`,
  );
  return data?.listings ?? [];
}

export async function fetchLatestBusinesses(limit = 12): Promise<PublicDirectoryListing[]> {
  const data = await safeJson<{ listings: PublicDirectoryListing[] }>(
    `/public/listings/businesses?limit=${limit}`,
  );
  return data?.listings ?? [];
}

export async function fetchLatestProfessionals(limit = 12): Promise<PublicDirectoryListing[]> {
  const data = await safeJson<{ listings: PublicDirectoryListing[] }>(
    `/public/listings/professionals?limit=${limit}`,
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