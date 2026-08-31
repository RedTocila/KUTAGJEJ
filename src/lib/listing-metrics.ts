'use client';

import { authHeaders, clientFetch } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { AUTH_USER_KEY, readAuthItem } from '@/lib/auth/storage';

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
const VIEW_METRIC_PREFIX = 'kutagjej-view-metric:';
const VIEW_METRIC_TTL_MS = 30 * 60 * 1000;

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

function claimViewMetric(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `${VIEW_METRIC_PREFIX}${key}`;
  const now = String(Date.now());
  try {
    const previous = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(previous) && Date.now() - previous < VIEW_METRIC_TTL_MS) {
      return null;
    }
    localStorage.setItem(storageKey, now);
    return now;
  } catch {
    return now;
  }
}

function releaseViewMetric(key: string, claim: string): void {
  if (typeof window === 'undefined') return;
  try {
    const storageKey = `${VIEW_METRIC_PREFIX}${key}`;
    if (localStorage.getItem(storageKey) === claim) {
      localStorage.removeItem(storageKey);
    }
  } catch {
    /* ignore storage failures */
  }
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

export type SavedListingsCache = {
  items: SavedListingItem[];
  keys: string[];
  page: number;
  totalPages: number;
  total: number;
};

const SAVED_LIST_CACHE_PREFIX = 'kutagjej-saved-list:v1:';
const SAVED_LIST_CACHE_TTL_MS = 10 * 60 * 1000;

function currentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = readAuthItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return typeof parsed?.id === 'string' && parsed.id ? parsed.id : null;
  } catch {
    return null;
  }
}

let memorySavedList: SavedListingsCache | null = null;
let memorySavedUserId: string | null = null;
let savedListInflight: Promise<{
  items?: SavedListingItem[];
  keys?: string[];
  total?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}> | null = null;

function readSavedListSession(userId: string): SavedListingsCache | null {
  try {
    const raw = sessionStorage.getItem(`${SAVED_LIST_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; payload?: SavedListingsCache };
    if (!parsed || typeof parsed.at !== 'number' || !parsed.payload || !Array.isArray(parsed.payload.items)) {
      return null;
    }
    if (Date.now() - parsed.at > SAVED_LIST_CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeSavedListSession(userId: string, payload: SavedListingsCache): void {
  try {
    sessionStorage.setItem(
      `${SAVED_LIST_CACHE_PREFIX}${userId}`,
      JSON.stringify({ at: Date.now(), payload }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function getCachedSavedListings(): SavedListingsCache | null {
  const userId = currentUserId();
  if (!userId) return memorySavedList;
  if (memorySavedList && memorySavedUserId === userId) return memorySavedList;
  const stored = readSavedListSession(userId);
  if (!stored) return memorySavedList;
  memorySavedList = stored;
  memorySavedUserId = userId;
  return stored;
}

export function setCachedSavedListings(payload: SavedListingsCache | null): void {
  memorySavedList = payload;
  const userId = currentUserId();
  memorySavedUserId = userId;
  if (payload && userId) writeSavedListSession(userId, payload);
}

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
  const share = page === 1 && limit === 24;
  if (share && savedListInflight) return savedListInflight;

  const request = (async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    const res = await clientFetch<{
      items?: SavedListingItem[];
      keys?: string[];
      total?: number;
      page?: number;
      totalPages?: number;
      message?: string;
    }>(`/listing-metrics/saved?${params}`);
    if (!res.ok) return { error: res.error ?? 'Gabim.' };
    const payload: SavedListingsCache = {
      items: (res.data?.items ?? []) as SavedListingItem[],
      keys: (res.data?.keys ?? []) as string[],
      total: res.data?.total ?? 0,
      page: res.data?.page ?? page,
      totalPages: res.data?.totalPages ?? 1,
    };
    if (share) setCachedSavedListings(payload);
    return payload;
  })();

  if (share) {
    savedListInflight = request.finally(() => {
      savedListInflight = null;
    });
    return savedListInflight;
  }
  return request;
}

/** Warm saved cards so the bookmark tab paints like the homepage. */
export function prefetchSavedListings(): Promise<SavedListingsCache | null> {
  const cached = getCachedSavedListings();
  if (cached) {
    void fetchSavedListings(1, 24);
    return Promise.resolve(cached);
  }
  return fetchSavedListings(1, 24).then((res) => {
    if (res.error) return getCachedSavedListings();
    return getCachedSavedListings();
  });
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

/** Merge a confirmed share into the visible count. Optimistic (`null`) ticks +1; a server total never double-counts. */
export function nextShareCount(current: number, metrics: ListingMetrics | null | undefined): number {
  const reported = metrics?.shareCount;
  if (typeof reported === 'number') return Math.max(current, reported);
  return current + 1;
}

/** Merge a confirmed view into the visible count. Never optimistic — dedup often returns the same total. */
export function nextViewCount(current: number, metrics: ListingMetrics | null | undefined): number {
  const reported = metrics?.viewCount;
  if (typeof reported === 'number' && Number.isFinite(reported)) return Math.max(current, reported);
  return current;
}

/**
 * Merge a save-toggle response into the visible count.
 * Bookmark `saved` is tracked separately — never snap the number back to 0 while saved.
 */
export function nextSaveCount(
  current: number,
  result: { saved?: boolean; saveCount?: number; stale?: boolean } | null | undefined,
): number {
  if (!result || result.stale) return current;
  if (result.saved) {
    const reported = typeof result.saveCount === 'number' ? result.saveCount : 0;
    return Math.max(current, reported, 1);
  }
  if (typeof result.saveCount === 'number') return Math.max(0, result.saveCount);
  return current;
}

/**
 * Count shown on a card/detail after navigation.
 * Bookmark keys survive page changes; listing payloads often still have the old saveCount
 * until a later refetch — `cached` is the toggle we already confirmed this session.
 */
export function resolveVisibleSaveCount(input: {
  initial: number;
  saved: boolean;
  cached?: number | null;
}): number {
  const base = Number.isFinite(input.initial) ? Math.max(0, input.initial) : 0;
  const held = typeof input.cached === 'number' && Number.isFinite(input.cached) ? Math.max(0, input.cached) : null;
  if (held != null) {
    return input.saved ? Math.max(held, base, 1) : held;
  }
  return input.saved ? Math.max(base, 1) : base;
}

function beaconListingMetric(url: string, body: string): void {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  try {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  } catch {
    /* ignore */
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
  const url = getApiUrl('/listing-metrics/event');
  const body = JSON.stringify({ listingKind, listingId, event });
  const viewKey = event === 'view' ? listingMetricsKey(listingKind, listingId) : null;
  const viewClaim = viewKey ? claimViewMetric(viewKey) : null;
  if (event === 'view' && !viewClaim) return Promise.resolve(null);
  const pageHidden =
    event === 'share' && typeof document !== 'undefined' && document.visibilityState === 'hidden';

  // Instagram / Messages background Safari. A regular fetch is killed; keepalive JSON
  // POSTs are dropped on iOS. Beacon while hidden, fetch while the tab is visible.
  if (pageHidden) {
    beaconListingMetric(url, body);
    return null;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: metricHeaders(),
      body,
    });
    if (!res.ok) {
      if (viewKey && viewClaim) releaseViewMetric(viewKey, viewClaim);
      return null;
    }
    try {
      const data = (await res.json()) as ListingMetrics;
      return metricsFromListing(data);
    } catch {
      // Posted successfully; the body was unreadable (backgrounded webview).
      return null;
    }
  } catch {
    if (viewKey && viewClaim) releaseViewMetric(viewKey, viewClaim);
    if (event === 'share') beaconListingMetric(url, body);
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
