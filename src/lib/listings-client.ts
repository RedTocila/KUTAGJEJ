'use client';

import type { ListingCategory } from '@/types/listing-category';
import type { ListingMetrics } from '@/lib/listing-metrics';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { authHeaders } from '@/lib/api-client';
import { getAccessToken } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export interface RealEstateListingPayload {
  propertyCategory: string;
  title: string;
  description: string;
  transactionType: 'rent' | 'sale';
  price: number;
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
  make: string;
  model: string;
  variant: string;
  description?: string;
  year: number;
  kilometers: number;
  transmission: string;
  fuelType: string;
  price: number;
  currency: string;
  color: string;
  finish: string[];
  extras?: string[];
  cityId?: string | null;
  cityName: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
}

export interface JobMineListing extends ListingMetrics {
  id: string;
  title: string;
  description: string;
  industry: string;
  cityId?: string | null;
  cityName: string | null;
  education: string;
  experience: string;
  jobType: string;
  workLocation: string;
  salary: number | null;
  currency: string | null;
  contactPhone: string | null;
  responsibilities: string[];
  requirements: string[];
  benefits: { id: string; label: string }[];
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
}

export interface MarketplaceMineListing extends ListingMetrics {
  id: string;
  title: string;
  description?: string;
  category: string;
  condition: string | null;
  price: number | null;
  currency: string | null;
  cityId?: string | null;
  cityName: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

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

export type ListingCreateResult = {
  id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  message?: string;
  error?: string;
};

export async function createRealEstateListing(
  body: RealEstateListingPayload,
): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl('/listings/real-estate'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
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

export async function updateRealEstateListing(
  id: string,
  body: RealEstateListingPayload,
): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl(`/listings/real-estate/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update listing.' };
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
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
  try {
    const res = await fetch(getApiUrl('/listings/jobs'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
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

export async function updateJobListing(id: string, body: JobListingPayload): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl(`/listings/jobs/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update listing.' };
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export interface MarketplaceListingPayload {
  transactionType: string;
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  currency: string | null;
  cityId: string;
  contactPhone: string;
  imageUrls?: string[];
}

export async function createMarketplaceListing(body: MarketplaceListingPayload): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl('/listings/marketplace'), {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
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

export async function updateMarketplaceListing(
  id: string,
  body: MarketplaceListingPayload,
): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl(`/listings/marketplace/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update listing.' };
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
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
  make: string;
  model: string;
  variant?: string;
  description: string;
  year: number;
  kilometers: number;
  transmission: string;
  fuelType: string;
  price: number;
  currency: string;
  color: string;
  finish: string[];
  extras: string[];
  cityId: string;
  contactPhone: string;
  imageUrls?: string[];
};

export async function updateCarListing(id: string, body: CarListingJsonPayload): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl(`/listings/cars/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update listing.' };
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
