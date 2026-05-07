/**
 * Server-friendly client for the platform's public listing endpoints.
 *
 * Designed to be safely callable from both Server Components (during SSR) and
 * Client Components. Returns empty arrays on failure so the UI can always
 * render — perfect for early-stage deployments where the API may be cold or
 * a vertical may have no listings yet.
 */

export interface PublicRealEstateListing {
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
}

export interface PublicCarListing {
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
}

export interface PublicJobListing {
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
}

export interface PublicMarketplaceListing {
  id: string;
  kind: 'marketplace';
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
}

export interface PublicDirectoryListing {
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
  /** Biznese venues only — opening times as plain text. */
  openingHours: string | null;
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  /** Short “what we offer” line for venues. */
  servicesHighlight: string | null;
}

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
