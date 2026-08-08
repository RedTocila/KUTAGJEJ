'use client';

import { authHeaders } from '@/lib/api-client';
import { getApiUrl } from '@/lib/api-config';
import { getVisitorId, type ListingMetricKind } from '@/lib/listing-metrics';

/** Midpoint of the 45–60s “active engagement” window. */
export const HOT_LEAD_DWELL_MS = 50_000;
export const HOT_LEAD_MIN_PHOTOS = 4;
/** Significant scroll depth through the listing page. */
export const HOT_LEAD_SCROLL_RATIO = 0.55;
/** Return / repeat-view / multi-listing / cooldown window. */
export const HOT_LEAD_RETURN_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Idle longer than this pauses active dwell accumulation. */
export const HOT_LEAD_ACTIVE_IDLE_MS = 5_000;

export const HOT_LEAD_PHOTO_EVENT = 'kutagjej:listing-photo';
export const HOT_LEAD_SAVE_EVENT = 'kutagjej:hot-lead-save';
export const HOT_LEAD_SHARE_EVENT = 'kutagjej:hot-lead-share';
export const HOT_LEAD_DETAILS_EVENT = 'kutagjej:hot-lead-details';
export const HOT_LEAD_CONTACT_ACTION_EVENT = 'kutagjej:hot-lead-contact-action';

/** Supporting + high-intent engagement flags sent with `hot_lead` events. */
export type HotLeadSignals = {
  dwell: boolean;
  photos: boolean;
  scroll: boolean;
  details: boolean;
  saved: boolean;
  shared: boolean;
  returned: boolean;
  multiListing: boolean;
  repeatView: boolean;
};

export const HOT_LEAD_SIGNAL_KEYS = [
  'dwell',
  'photos',
  'scroll',
  'details',
  'saved',
  'shared',
  'returned',
  'multiListing',
  'repeatView',
] as const satisfies readonly (keyof HotLeadSignals)[];

/** Must include ≥1 of these among the ≥3 total signals. */
export const HOT_LEAD_HIGH_INTENT_KEYS = [
  'saved',
  'shared',
  'returned',
  'multiListing',
  'repeatView',
] as const satisfies readonly (keyof HotLeadSignals)[];

export function emptyHotLeadSignals(): HotLeadSignals {
  return {
    dwell: false,
    photos: false,
    scroll: false,
    details: false,
    saved: false,
    shared: false,
    returned: false,
    multiListing: false,
    repeatView: false,
  };
}

export function countHotLeadSignals(signals: HotLeadSignals): number {
  let n = 0;
  for (const key of HOT_LEAD_SIGNAL_KEYS) {
    // returned + repeatView are the same 2+ visit behavior — count once.
    if (key === 'repeatView') continue;
    if (key === 'returned') {
      if (signals.returned || signals.repeatView) n += 1;
      continue;
    }
    if (signals[key]) n += 1;
  }
  return n;
}

export function countHotLeadHighIntentSignals(signals: HotLeadSignals): number {
  let n = 0;
  for (const key of HOT_LEAD_HIGH_INTENT_KEYS) {
    if (key === 'repeatView') continue;
    if (key === 'returned') {
      if (signals.returned || signals.repeatView) n += 1;
      continue;
    }
    if (signals[key]) n += 1;
  }
  return n;
}

/** ≥3 meaningful signals including ≥1 high-intent behavior. */
export function qualifiesAsHotLead(signals: HotLeadSignals): boolean {
  return countHotLeadSignals(signals) >= 3 && countHotLeadHighIntentSignals(signals) >= 1;
}

function visitsStorageKey(kind: ListingMetricKind, listingId: string): string {
  return `kutagjej-hot-lead-visits:${kind}:${listingId}`;
}

function firedStorageKey(kind: ListingMetricKind, listingId: string): string {
  return `kutagjej-hot-lead-fired:${kind}:${listingId}`;
}

function ownerViewsStorageKey(ownerId: string): string {
  return `kutagjej-hot-lead-owner:${ownerId}`;
}

function contactedStorageKey(kind: ListingMetricKind, listingId: string): string {
  return `kutagjej-hot-lead-contacted:${kind}:${listingId}`;
}

type OwnerViewRecord = { listingId: string; at: number };

/** Prior visits in the return window (before recording the current one). */
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

/**
 * Record this page open.
 * - `returned` / `repeatView`: 2nd+ visit within the window (2+ views)
 */
export function recordListingVisitForHotLead(
  kind: ListingMetricKind,
  listingId: string,
  now = Date.now(),
): { returned: boolean; repeatView: boolean } {
  if (typeof window === 'undefined') return { returned: false, repeatView: false };
  const prior = readPriorVisitsWithinWindow(kind, listingId, now);
  const returned = prior.length >= 1;
  const repeatView = prior.length >= 1;
  const next = [...prior, now].slice(-12);
  try {
    localStorage.setItem(visitsStorageKey(kind, listingId), JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return { returned, repeatView };
}

/** Track listing views per owner; returns true if another listing of theirs was viewed recently. */
export function recordOwnerListingViewForHotLead(
  ownerId: string | null | undefined,
  listingId: string,
  now = Date.now(),
): boolean {
  if (typeof window === 'undefined') return false;
  const id = typeof ownerId === 'string' ? ownerId.trim() : '';
  if (!id) return false;
  let prior: OwnerViewRecord[] = [];
  try {
    const raw = localStorage.getItem(ownerViewsStorageKey(id));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        prior = parsed
          .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const listing = String((row as OwnerViewRecord).listingId || '').trim();
            const at = Number((row as OwnerViewRecord).at);
            if (!listing || !Number.isFinite(at)) return null;
            if (now - at > HOT_LEAD_RETURN_WINDOW_MS || now - at < 0) return null;
            return { listingId: listing, at };
          })
          .filter((row): row is OwnerViewRecord => Boolean(row));
      }
    }
  } catch {
    prior = [];
  }

  const multiListing = prior.some((row) => row.listingId !== listingId);
  const next = [...prior.filter((row) => row.listingId !== listingId), { listingId, at: now }].slice(-20);
  try {
    localStorage.setItem(ownerViewsStorageKey(id), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return multiListing;
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

export function hasHotLeadContactAction(
  kind: ListingMetricKind,
  listingId: string,
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(contactedStorageKey(kind, listingId)) === '1';
  } catch {
    return false;
  }
}

export function markHotLeadContactAction(
  kind: ListingMetricKind,
  listingId: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(contactedStorageKey(kind, listingId), '1');
  } catch {
    /* ignore */
  }
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

export function emitHotLeadSave(listingKind: ListingMetricKind, listingId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(HOT_LEAD_SAVE_EVENT, { detail: { listingKind, listingId } }),
  );
}

export function emitHotLeadShare(listingKind: ListingMetricKind, listingId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(HOT_LEAD_SHARE_EVENT, { detail: { listingKind, listingId } }),
  );
}

/** Fired when the visitor expands description / important listing copy. */
export function emitHotLeadDetailsExpand(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HOT_LEAD_DETAILS_EVENT));
}

/**
 * Direct contact intent (message, call, WhatsApp, inquiry).
 * Stops High Interest evaluation — those visitors belong to the contact lead path.
 */
export function emitHotLeadContactAction(detail?: {
  listingKind?: string;
  listingId?: string;
}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(HOT_LEAD_CONTACT_ACTION_EVENT, { detail: detail ?? {} }));
}

export function isContactActionHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const value = href.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith('tel:')) return true;
  if (value.startsWith('sms:')) return true;
  if (value.startsWith('mailto:')) return true;
  if (value.includes('wa.me/') || value.includes('api.whatsapp.com') || value.includes('whatsapp.com')) {
    return true;
  }
  return false;
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
