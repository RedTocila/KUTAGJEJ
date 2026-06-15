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
    clickCount: listing?.clickCount ?? 0,
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

export async function fetchListingMetricsBatch(
  refs: { kind: ListingMetricKind; listingId: string }[],
): Promise<Record<string, ListingMetrics & { saved?: boolean }>> {
  if (refs.length === 0) return {};
  try {
    const items = refs.map((r) => `${r.kind}:${r.listingId}`).join(',');
    const res = await fetch(getApiUrl(`/listing-metrics/batch?items=${encodeURIComponent(items)}`), {
      headers: metricHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { metrics?: Record<string, ListingMetrics & { saved?: boolean }> };
    return data.metrics ?? {};
  } catch {
    return {};
  }
}

/** Records a share on click, then opens the native share sheet or copies the URL. */
export async function shareListing(opts: {
  title: string;
  listingKind: ListingMetricKind;
  listingId: string;
  url?: string;
}): Promise<ListingMetrics | null> {
  const metrics = await recordListingMetricEvent(opts.listingKind, opts.listingId, 'share');
  const url = opts.url ?? (typeof window !== 'undefined' ? window.location.href : '');

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: opts.title, text: opts.title, url });
    } else if (typeof navigator !== 'undefined') {
      await navigator.clipboard.writeText(url);
    }
  } catch {
    /* cancelled or blocked */
  }

  return metrics;
}

export async function recordListingMetricEvent(
  listingKind: ListingMetricKind,
  listingId: string,
  event: 'view' | 'click' | 'share',
): Promise<ListingMetrics | null> {
  try {
    const res = await fetch(getApiUrl('/listing-metrics/event'), {
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
