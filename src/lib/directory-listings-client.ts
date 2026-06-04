'use client';

import type { ListingMetrics } from '@/lib/listing-metrics';
import type { WeeklyHourRow } from '@/lib/business-constants';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

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
    const res = await fetch(`${API_URL}/listings/directory/businesses/mine`, {
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
): Promise<{ id?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/listings/directory/businesses`, {
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

export async function updateBusinessListing(
  id: string,
  body: BusinessListingPayload,
): Promise<{ error?: string }> {
  try {
    const res = await fetch(`${API_URL}/listings/directory/businesses/${encodeURIComponent(id)}`, {
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
      `${API_URL}/listings/directory/businesses/${encodeURIComponent(listingId)}/reservations${q}`,
      { headers: authHeaders(), cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Could not load reservations.' };
    return { reservations: data.reservations as BusinessReservationRow[] };
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
      `${API_URL}/listings/directory/businesses/reservations/${encodeURIComponent(reservationId)}`,
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
