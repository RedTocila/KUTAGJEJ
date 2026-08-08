'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { getVisitorId, type ListingMetricKind } from '@/lib/listing-metrics';

export const HOT_LEAD_DWELL_MS = 40_000;
export const HOT_LEAD_MIN_PHOTOS = 3;
export const HOT_LEAD_RETURN_WINDOW_MS = 24 * 60 * 60 * 1000;
export const HOT_LEAD_CONTACT_ATTR = 'data-listing-contact';
export const HOT_LEAD_PHOTO_EVENT = 'kutagjej:listing-photo';

export type HotLeadSignals = {
  dwell: boolean;
  photos: boolean;
  contact: boolean;
  returned: boolean;
};

function visitsStorageKey(kind: ListingMetricKind, listingId: string): string {
  return `kutagjej-hot-lead-visits:${kind}:${listingId}`;
}

function firedStorageKey(kind: ListingMetricKind, listingId: string): string {
  return `kutagjej-hot-lead-fired:${kind}:${listingId}`;
}

/** Prior visits in the last 24h (before recording the current one). */
export function readPriorVisitsWithinWindow(
  kind: ListingMetricKind,
  listingId: string,
  now = Date.now(),
): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(visitsStorageKey(kind, listingId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((ms) => Number.isFinite(ms) && now - ms <= HOT_LEAD_RETURN_WINDOW_MS && now - ms >= 0);
  } catch {
    return [];
  }
}

/** Record this page open; returns true if this is a return visit (2nd+ within 24h). */
export function recordListingVisitForHotLead(
  kind: ListingMetricKind,
  listingId: string,
  now = Date.now(),
): boolean {
  if (typeof window === 'undefined') return false;
  const prior = readPriorVisitsWithinWindow(kind, listingId, now);
  const returned = prior.length >= 1;
  const next = [...prior, now].slice(-12);
  try {
    localStorage.setItem(visitsStorageKey(kind, listingId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return returned;
}

export function hasFiredHotLeadRecently(
  kind: ListingMetricKind,
  listingId: string,
  now = Date.now(),
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(firedStorageKey(kind, listingId));
    const ms = Number(raw);
    if (!Number.isFinite(ms)) return false;
    return now - ms <= HOT_LEAD_RETURN_WINDOW_MS;
  } catch {
    return false;
  }
}

export function markHotLeadFired(kind: ListingMetricKind, listingId: string, now = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(firedStorageKey(kind, listingId), String(now));
  } catch {
    /* ignore */
  }
}

export function countHotLeadSignals(signals: HotLeadSignals): number {
  return (['dwell', 'photos', 'contact', 'returned'] as const).filter((k) => signals[k]).length;
}

export function emitListingPhotoView(
  listingKind: ListingMetricKind,
  listingId: string,
  index: number,
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(HOT_LEAD_PHOTO_EVENT, {
      detail: { listingKind, listingId, index },
    }),
  );
}

export async function recordHotLeadEvent(
  listingKind: ListingMetricKind,
  listingId: string,
  signals: HotLeadSignals,
): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/listing-metrics/event'), {
      method: 'POST',
      headers: {
        ...authHeaders({ 'X-Visitor-Id': getVisitorId() }),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listingKind, listingId, event: 'hot_lead', signals }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
