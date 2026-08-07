'use client';

import type { ListingCreateResult } from '@/lib/listings-client';
import type { ListingMetrics } from '@/lib/listing-metrics';
import type { WeeklyHourRow } from '@/lib/business-constants';
import { authHeaders, authHeadersAsync } from '@/lib/api-client';
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
  /** Omit on profile save so an existing menu is preserved. */
  menuCategories?: BusinessMenuCategory[];
  menuItems?: BusinessMenuItem[];
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  reservationTimeSlots: string[];
  reservationPartySizes: number[];
  servicesHighlight: string | null;
}

export interface BusinessMenuPayload {
  menuCategories: BusinessMenuCategory[];
  menuItems: BusinessMenuItem[];
}

export interface BusinessMineListing extends ListingMetrics {
  id: string;
  title: string;
  description?: string;
  category: string;
  cityId: string | null;
  cityName: string | null;
  contactPhone?: string | null;
  imageUrls: string[];
  openingHours?: string | null;
  weeklyHours?: WeeklyHourRow[];
  menuCategories?: BusinessMenuCategory[];
  menuItems?: BusinessMenuItem[];
  reservationsEnabled?: boolean;
  reservationUrl?: string | null;
  reservationTimeSlots?: string[];
  reservationPartySizes?: number[];
  servicesHighlight: string | null;
  announcementTitle: string | null;
  announcementSubtitle: string | null;
  announcementBannerUrl: string | null;
  announcementAt?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
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

export async function getMyBusinessListing(id: string): Promise<{
  listing?: BusinessMineListing;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/listings/directory/businesses/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as BusinessMineListing };
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
      headers: await authHeadersAsync(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          typeof data.message === 'string'
            ? data.message
            : res.status === 401
              ? 'Sesioni skadoi. Hyni përsëri.'
              : 'Nuk u ruajt njoftimi.',
      };
    }
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateBusinessListing(
  id: string,
  body: Partial<BusinessListingPayload>,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/directory/businesses/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: await authHeadersAsync(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          typeof data.message === 'string'
            ? data.message
            : res.status === 401
              ? 'Sesioni skadoi. Hyni përsëri.'
              : 'Nuk u përditësua njoftimi.',
      };
    }
    return {};
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

/** Save only the business menu (categories + items). */
export async function updateBusinessMenu(
  id: string,
  body: BusinessMenuPayload,
): Promise<{ error?: string }> {
  return updateBusinessListing(id, body);
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
  description?: string;
  category: string;
  condition: string | null;
  price: number | null;
  currency: string | null;
  cityId: string | null;
  cityName: string | null;
  contactPhone?: string | null;
  imageUrls: string[];
  responseTimeHours?: number | null;
  portfolioItems?: ProfessionalPortfolioItem[];
  servicesHighlight: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
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

export async function getMyProfessionalListing(id: string): Promise<{
  listing?: ProfessionalMineListing;
  error?: string;
}> {
  try {
    const res = await fetch(getApiUrl(`/listings/directory/professionals/mine/${encodeURIComponent(id)}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load listing.' };
    return { listing: data.listing as ProfessionalMineListing };
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
      headers: await authHeadersAsync(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          typeof data.message === 'string'
            ? data.message
            : res.status === 401
              ? 'Sesioni skadoi. Hyni përsëri.'
              : 'Nuk u ruajt njoftimi.',
      };
    }
    return {
      id: data.listing?.id as string | undefined,
      status: data.listing?.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function updateProfessionalListing(
  id: string,
  body: Partial<ProfessionalListingPayload>,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(getApiUrl(`/listings/directory/professionals/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: await authHeadersAsync(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error:
          typeof data.message === 'string'
            ? data.message
            : res.status === 401
              ? 'Sesioni skadoi. Hyni përsëri.'
              : 'Nuk u përditësua njoftimi.',
      };
    }
    return {};
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
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
