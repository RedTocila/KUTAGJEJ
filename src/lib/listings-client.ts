'use client';

import type { ListingCategory } from '@/types/listing-category';
import type { ListingMetricKind, ListingMetrics } from '@/lib/listing-metrics';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import type { BusinessMineListing, ProfessionalMineListing } from '@/lib/directory-listings-client';
import { authHeaders, authHeadersAsync, getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

async function jsonAuthFetch<T extends Record<string, unknown>>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(getApiUrl(path), {
      ...init,
      headers: {
        ...(await authHeadersAsync()),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    const data = (await res.json().catch(() => ({}))) as T & { message?: string };
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof data.message === 'string'
            ? data.message
            : res.status === 401
              ? 'Sesioni skadoi. Hyni përsëri.'
              : 'Nuk u ruajt njoftimi.',
      };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Nuk u arrit lidhja me serverin.' };
  }
}


export interface RealEstateListingPayload {
  propertyCategory: string;
  title: string;
  description: string;
  transactionType: 'rent' | 'sale';
  price: number;
  originalPrice?: number | null;
  currency: 'EUR' | 'LEK';
  surfaceM2: number;
  cityId: string;
  zoneId: string;
  contactPhone: string;
  condition?: string;
  apartmentTypeSlug?: string;
  floor?: number;
  totalFloors?: number;
  parkingFloor?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  yearBuilt?: number;
  imageUrls?: string[];
}

export async function listCategoriesPublic(): Promise<{ categories?: ListingCategory[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/categories'), { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Failed to load categories.' };
    return { categories: data.categories as ListingCategory[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

// ---------------------------------------------------------------------------
// Types for "my listings" responses
// ---------------------------------------------------------------------------

export interface CarMineListing extends ListingMetrics {
  id: string;
  vehicleType: string;
  make: string;
  model: string;
  variant: string;
  description?: string;
  year: number;
  kilometers: number;
  transmission: string;
  fuelType: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  color: string;
  finish?: string[];
  extras?: string[];
  cityId?: string | null;
  cityName: string | null;
  contactPhone?: string | null;
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isOkazion?: boolean;
  okazionUntil?: string | null;
}

export interface JobMineListing extends ListingMetrics {
  id: string;
  title: string;
  description?: string;
  industry: string;
  cityId?: string | null;
  cityName: string | null;
  education: string;
  experience: string;
  jobType: string;
  workLocation: string;
  salary: number | null;
  currency: string | null;
  contactPhone?: string | null;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: { id: string; label: string }[];
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isOkazion?: boolean;
  okazionUntil?: string | null;
}

export interface MarketplaceMineListing extends ListingMetrics {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: string | null;
  price: number | null;
  originalPrice?: number | null;
  currency: string | null;
  cityId?: string | null;
  cityName: string | null;
  contactPhone?: string | null;
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isOkazion?: boolean;
  okazionUntil?: string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

export async function listMyListings(): Promise<{
  realEstate?: RealEstateMineListing[];
  cars?: CarMineListing[];
  jobs?: JobMineListing[];
  marketplace?: MarketplaceMineListing[];
  businesses?: BusinessMineListing[];
  professionals?: ProfessionalMineListing[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/mine'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: typeof data.message === 'string' ? data.message : 'Could not load listings.' };
    }
    return {
      realEstate: (data.realEstate ?? []) as RealEstateMineListing[],
      cars: (data.cars ?? []) as CarMineListing[],
      jobs: (data.jobs ?? []) as JobMineListing[],
      marketplace: (data.marketplace ?? []) as MarketplaceMineListing[],
      businesses: (data.businesses ?? []) as BusinessMineListing[],
      professionals: (data.professionals ?? []) as ProfessionalMineListing[],
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listMyRealEstateListings(): Promise<{
  listings?: RealEstateMineListing[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/real-estate/mine'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listings.' };
    return { listings: data.listings as RealEstateMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function getMyRealEstateListing(id: string): Promise<{
  listing?: RealEstateMineListing;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/listings/real-estate/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as RealEstateMineListing };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export type ListingCreateResult = {
  id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  message?: string;
  error?: string;
};

export async function createRealEstateListing(
  body: RealEstateListingPayload,
): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    '/listings/real-estate',
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export async function updateRealEstateListing(
  id: string,
  body: RealEstateListingPayload,
): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    `/listings/real-estate/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export async function listMyCarListings(): Promise<{ listings?: CarMineListing[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/listings/cars/mine'), { headers: authHeaders(), cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load car listings.' };
    return { listings: data.listings as CarMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function getMyCarListing(id: string): Promise<{ listing?: CarMineListing; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/cars/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as CarMineListing };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listMyJobListings(): Promise<{ listings?: JobMineListing[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/listings/jobs/mine'), { headers: authHeaders(), cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load job listings.' };
    return { listings: data.listings as JobMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function getMyJobListing(id: string): Promise<{ listing?: JobMineListing; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/jobs/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as JobMineListing };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listMyMarketplaceListings(): Promise<{ listings?: MarketplaceMineListing[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/listings/marketplace/mine'), { headers: authHeaders(), cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load marketplace listings.' };
    return { listings: data.listings as MarketplaceMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function getMyMarketplaceListing(id: string): Promise<{ listing?: MarketplaceMineListing; error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/marketplace/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as MarketplaceMineListing };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export interface JobListingBenefitPayload {
  id: string;
  label: string;
}

export interface JobListingPayload {
  title: string;
  description: string;
  industry: string;
  cityId: string;
  education: string;
  experience: string;
  jobType: string;
  workLocation: string;
  salary: number | null;
  currency: string | null;
  contactPhone: string;
  responsibilities: string[];
  requirements: string[];
  benefits: JobListingBenefitPayload[];
  imageUrls?: string[];
}

export async function createJobListing(body: JobListingPayload): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    '/listings/jobs',
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export async function updateJobListing(id: string, body: JobListingPayload): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    `/listings/jobs/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export interface MarketplaceListingPayload {
  transactionType: string;
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  originalPrice?: number | null;
  currency: string | null;
  cityId: string;
  contactPhone: string;
  imageUrls?: string[];
}

export async function createMarketplaceListing(body: MarketplaceListingPayload): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    '/listings/marketplace',
    { method: 'POST', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export async function updateMarketplaceListing(
  id: string,
  body: MarketplaceListingPayload,
): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    `/listings/marketplace/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export async function createCarListing(formData: FormData): Promise<ListingCreateResult> {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(getApiUrl('/listings/cars'), {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not save listing.' };
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export type CarListingJsonPayload = {
  vehicleType: string;
  make: string;
  model: string;
  variant?: string;
  description: string;
  year: number;
  kilometers: number;
  transmission: string;
  fuelType: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  color: string;
  finish: string[];
  extras: string[];
  cityId: string;
  contactPhone: string;
  imageUrls?: string[];
};

export async function updateCarListing(id: string, body: CarListingJsonPayload): Promise<ListingCreateResult> {
  const res = await jsonAuthFetch<{ listing?: { id?: string; status?: ListingCreateResult['status'] }; message?: string }>(
    `/listings/cars/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  if (!res.ok) return { error: res.error };
  return {
    id: res.data.listing?.id,
    status: res.data.listing?.status,
    message: typeof res.data.message === 'string' ? res.data.message : undefined,
  };
}

export type DeleteMyListingItem = { kind: ListingMetricKind; id: string };

export async function deleteMyListing(
  kind: ListingMetricKind,
  id: string,
): Promise<{ ok?: true; error?: string }> {
  const res = await jsonAuthFetch<{ ok?: boolean; message?: string }>(
    `/listings/owner/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) return { error: res.error };
  return { ok: true };
}

export async function deleteMyListings(
  items: DeleteMyListingItem[],
): Promise<{
  deleted?: DeleteMyListingItem[];
  failed?: Array<DeleteMyListingItem & { message?: string }>;
  error?: string;
}> {
  const unique = [
    ...new Map(
      items
        .map((item) => ({ kind: item.kind, id: String(item.id || '').trim() }))
        .filter((item) => item.kind && item.id)
        .map((item) => [`${item.kind}:${item.id}`, item] as const),
    ).values(),
  ];
  if (unique.length === 0) return { error: 'Nuk u zgjodh asnjë njoftim.' };
  if (unique.length === 1) {
    const only = unique[0]!;
    const res = await deleteMyListing(only.kind, only.id);
    if (res.error) return { error: res.error, deleted: [], failed: [{ ...only, message: res.error }] };
    return { deleted: [only], failed: [] };
  }

  const res = await jsonAuthFetch<{
    ok?: boolean;
    deleted?: DeleteMyListingItem[];
    failed?: Array<DeleteMyListingItem & { message?: string }>;
    message?: string;
  }>('/listings/owner/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ items: unique }),
  });
  if (!res.ok) return { error: res.error, deleted: [], failed: [] };
  return {
    deleted: res.data.deleted ?? unique,
    failed: res.data.failed ?? [],
  };
}
