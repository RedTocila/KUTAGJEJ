'use client';

export type ListingMetricKind =
  | 'real-estate'
  | 'car'
  | 'job'
  | 'marketplace'
  | 'businesses'
  | 'professionals';

export interface ListingMetrics {
  viewCount: number;
  clickCount: number;
  shareCount: number;
  saveCount: number;
  saved?: boolean;
}

export const EMPTY_LISTING_METRICS: ListingMetrics = {
  viewCount: 0,
  clickCount: 0,
  shareCount: 0,
  saveCount: 0,
};

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api`;
const VISITOR_KEY = 'kutagjej-visitor-id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function metricHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('custom-auth-token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Visitor-Id': getVisitorId(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function metricsFromListing(
  listing: Partial<ListingMetrics> | null | undefined,
): ListingMetrics {
  return {
    viewCount: listing?.viewCount ?? 0,
    clickCount: listing?.clickCount ?? 0,
    shareCount: listing?.shareCount ?? 0,
    saveCount: listing?.saveCount ?? 0,
    saved: listing?.saved,
  };
}

export async function recordListingMetricEvent(
  listingKind: ListingMetricKind,
  listingId: string,
  event: 'view' | 'click' | 'share',
): Promise<ListingMetrics | null> {
  try {
    const res = await fetch(`${API_URL}/listing-metrics/event`, {
      method: 'POST',
      headers: metricHeaders(),
      body: JSON.stringify({ listingKind, listingId, event }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ListingMetrics;
    return metricsFromListing(data);
  } catch {
    return null;
  }
}

export async function toggleListingSave(
  listingKind: ListingMetricKind,
  listingId: string,
): Promise<(ListingMetrics & { saved: boolean }) | null> {
  try {
    const res = await fetch(`${API_URL}/listing-metrics/save`, {
      method: 'POST',
      headers: metricHeaders(),
      body: JSON.stringify({ listingKind, listingId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ListingMetrics & { saved: boolean };
    return { ...metricsFromListing(data), saved: Boolean(data.saved) };
  } catch {
    return null;
  }
}
