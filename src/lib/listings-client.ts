'use client';

import type { ListingCategory } from '@/types/listing-category';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

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
  condition?: string;
  apartmentTypeSlug?: string;
  floor?: number;
  totalFloors?: number;
  parkingFloor?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  yearBuilt?: number;
}

export async function listCategoriesPublic(): Promise<{ categories?: ListingCategory[]; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Failed to load categories.' };
    return { categories: data.categories as ListingCategory[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listMyRealEstateListings(): Promise<{
  listings?: RealEstateMineListing[];
  error?: string;
}> {
  try {
    const res = await fetch(`${API_URL}/listings/real-estate/mine`, {
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

export async function createRealEstateListing(
  body: RealEstateListingPayload,
): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/listings/real-estate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not save listing.' };
    return { id: data.listing?.id as string | undefined };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
