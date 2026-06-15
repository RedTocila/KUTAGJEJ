'use client';

import type { ListingCreateResult } from '@/lib/listings-client';
import type { ListingMetrics } from '@/lib/listing-metrics';
import type { WeeklyHourRow } from '@/lib/business-constants';
import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';


export type BusinessMenuCategory = { id: string; name: string; sortOrder: number };
export type BusinessMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: 'EUR' | 'LEK';
  imageUrl: string | null;
  sortOrder: number;
};

export interface BusinessListingPayload {
  title: string;
  description: string;
  category: string;
  cityId: string;
  contactPhone: string;
  imageUrls: string[];
  weeklyHours: WeeklyHourRow[];
  menuCategories: BusinessMenuCategory[];
  menuItems: BusinessMenuItem[];
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  reservationTimeSlots: string[];
  reservationPartySizes: number[];
  servicesHighlight: string | null;
}

export interface BusinessMineListing extends ListingMetrics {
  id: string;
  title: string;
  description: string;
  category: string;
  cityName: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  openingHours: string | null;
  weeklyHours: WeeklyHourRow[];
  menuCategories: BusinessMenuCategory[];
  menuItems: BusinessMenuItem[];
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  reservationTimeSlots: string[];
  reservationPartySizes: number[];
  servicesHighlight: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface BusinessReservationRow {
  id: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  reservationDate: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export async function listMyBusinessListings(): Promise<{
  listings?: BusinessMineListing[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/directory/businesses/mine'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listings.' };
    return { listings: data.listings as BusinessMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function createBusinessListing(
  body: BusinessListingPayload,
): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl('/listings/directory/businesses'), {
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

export async function updateBusinessListing(
  id: string,
  body: BusinessListingPayload,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/directory/businesses/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update listing.' };
    return {};
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function listBusinessReservations(
  listingId: string,
  status?: 'pending' | 'all',
): Promise<{ reservations?: BusinessReservationRow[]; error?: string }> {
  try {
    const q = status === 'pending' ? '?status=pending' : '';
    const res = await fetch(
      getApiUrl(`/listings/directory/businesses/${encodeURIComponent(listingId)}/reservations${q}`),
      { headers: authHeaders(), cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reservations.' };
    return { reservations: data.reservations as BusinessReservationRow[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export type ProfessionalPortfolioItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location: string | null;
  sortOrder: number;
};

export interface ProfessionalListingPayload {
  title: string;
  description: string;
  category: string;
  cityId: string;
  contactPhone: string;
  imageUrls: string[];
  responseTimeHours: number | null;
  portfolioItems: ProfessionalPortfolioItem[];
  price: number | null;
  currency: 'EUR' | 'LEK' | null;
  condition: string | null;
  servicesHighlight: string | null;
}

export interface ProfessionalMineListing extends ListingMetrics {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  currency: string | null;
  cityName: string | null;
  contactPhone: string | null;
  imageUrls: string[];
  responseTimeHours: number | null;
  portfolioItems: ProfessionalPortfolioItem[];
  servicesHighlight: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export async function listMyProfessionalListings(): Promise<{
  listings?: ProfessionalMineListing[];
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl('/listings/directory/professionals/mine'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listings.' };
    return { listings: data.listings as ProfessionalMineListing[] };
  } catch {
    return { error: 'Could not reach the server.' };
  }
}

export async function createProfessionalListing(
  body: ProfessionalListingPayload,
): Promise<ListingCreateResult> {
  try {
    const res = await fetch(getApiUrl('/listings/directory/professionals'), {
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

export async function patchBusinessReservationStatus(
  reservationId: string,
  status: 'pending' | 'confirmed' | 'cancelled',
): Promise<{ error?: string }> {
  try {
    const res = await fetch(
      getApiUrl(`/listings/directory/businesses/reservations/${encodeURIComponent(reservationId)}`),
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not update.' };
    return {};
  } catch {
    return { error: 'Could not reach the server.' };
  }
}
