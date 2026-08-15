'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';

export type ListingMetricKind =
  | 'real-estate'
  | 'car'
  | 'job'
  | 'marketplace'
  | 'businesses'
  | 'professionals';

export interface ListingMetrics {
  viewCount: number;
  shareCount: number;
  saveCount: number;
  saved?: boolean;
}

export const EMPTY_LISTING_METRICS: ListingMetrics = {
  viewCount: 0,
  shareCount: 0,
  saveCount: 0,
};

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
  return authHeaders({ 'X-Visitor-Id': getVisitorId() });
}

export function metricsFromListing(
  listing: Partial<ListingMetrics> | null | undefined,
): ListingMetrics {
  return {
    viewCount: listing?.viewCount ?? 0,
    shareCount: listing?.shareCount ?? 0,
    saveCount: listing?.saveCount ?? 0,
    saved: listing?.saved,
  };
}

export function listingMetricsKey(kind: ListingMetricKind, listingId: string): string {
  return `${kind}:${listingId}`;
}

export type SavedListingItem = {
  kind: ListingMetricKind;
  kindLabel: string;
  listingId: string;
  savedAt: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  permalinkPath: string | null;
  listing: Record<string, unknown> & ListingMetrics;
};

export async function fetchSavedListingKeys(): Promise<{ keys?: string[]; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/listing-metrics/saved/keys'), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return { keys: (data.keys ?? []) as string[] };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export async function fetchSavedListings(
  page = 1,
  limit = 24,
): Promise<{
  items?: SavedListingItem[];
  keys?: string[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await fetch(getApiUrl(`/listing-metrics/saved?${params}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.message === 'string' ? data.message : 'Gabim.' };
    return {
      items: (data.items ?? []) as SavedListingItem[],
      keys: (data.keys ?? []) as string[],
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

export type ListingSaverLead = {
  id: string;
  name: string;
  avatarUrl: string | null;
  savedAt: string;
};

/** Owner-only: people who saved a listing (Grow / Elite). */
export async function fetchListingSavers(
  listingKind: ListingMetricKind,
  listingId: string,
  page = 1,
  limit = 30,
): Promise<{
  savers?: ListingSaverLead[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
  code?: string;
}> {
  try {
    const params = new URLSearchParams({
      listingKind,
      listingId,
      page: String(page),
      limit: String(limit),
    });
    const res = await fetch(getApiUrl(`/listing-metrics/savers?${params}`), {
      headers: authHeaders(),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: typeof data.message === 'string' ? data.message : 'Gabim.',
        code: typeof data.code === 'string' ? data.code : undefined,
      };
    }
    return {
      savers: (data.savers ?? []) as ListingSaverLead[],
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    };
  } catch {
    return { error: 'Nuk u arrit lidhja me serverin.' };
  }
}

/** Opens the native share sheet or copies the URL, then records a share only on success. */
export async function shareListing(opts: {
  title: string;
  listingKind: ListingMetricKind;
  listingId: string;
  url?: string;
}): Promise<ListingMetrics | null> {
  const url = opts.url ?? (typeof window !== 'undefined' ? window.location.href : '');

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: opts.title, text: opts.title, url });
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(url);
    } else {
      return null;
    }
  } catch {
    /* cancelled or blocked — do not count as a share */
    return null;
  }

  return recordListingMetricEvent(opts.listingKind, opts.listingId, 'share');
}

export async function recordListingMetricEvent(
  listingKind: ListingMetricKind,
  listingId: string,
  event: 'view' | 'share',
): Promise<ListingMetrics | null> {
  try {
    const res = await fetch(getApiUrl('/listing-metrics/event'), {
      method: 'POST',
      headers: metricHeaders(),
      body: JSON.stringify({ listingKind, listingId, event }),
      // Sharing can move the browser into another app immediately. Keep the
      // request alive so the metric still reaches the API while the page is
      // being suspended or unloaded.
      keepalive: event === 'share',
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
    const res = await fetch(getApiUrl('/listing-metrics/save'), {
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
