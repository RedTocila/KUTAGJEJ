'use client';

import type { ListingMetricKind } from '@/lib/listing-metrics';

/** Spec icons supported by the Instagram story template. */
export type ListingShareSpecIcon =
  | 'bed'
  | 'bath'
  | 'ruler'
  | 'stairs'
  | 'calendar'
  | 'couch'
  | 'car'
  | 'gauge'
  | 'gas'
  | 'gear'
  | 'paint'
  | 'tag'
  | 'check'
  | 'sparkle'
  | 'clock'
  | 'briefcase'
  | 'buildings'
  | 'house'
  | 'star'
  | 'graduation'
  | 'map-pin'
  | 'storefront'
  | 'path';

export type ListingShareSpec = {
  icon: ListingShareSpecIcon;
  label: string;
};

/** Payload used to render the share sheet + Instagram story card. */
export type ListingSharePayload = {
  listingKind: ListingMetricKind;
  listingId: string;
  title: string;
  category?: string;
  priceLabel?: string;
  badge?: string;
  imageUrl?: string | null;
  location?: string;
  specs?: ListingShareSpec[];
  createdAt?: string | null;
  viewCount?: number;
  saveCount?: number;
  /** Absolute or path URL; defaults to current page. */
  url?: string;
};

export const DAILY_SHARE_BOOST_CREDITS = 3;

export function resolveListingShareUrl(payload: ListingSharePayload): string {
  if (payload.url) {
    if (payload.url.startsWith('http')) return payload.url;
    if (typeof window !== 'undefined') {
      return new URL(payload.url, window.location.origin).toString();
    }
    return payload.url;
  }
  if (typeof window !== 'undefined') return window.location.href;
  return '';
}

/**
 * Inline a remote image as a JPEG data URL for html-to-image / canvas export.
 * Safari often drops cross-origin `<img>` pixels in story captures unless embedded first.
 */
export async function embedImageAsDataUrl(
  url: string,
  maxEdge = 1400,
): Promise<string | null> {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:image/')) return raw;

  if (typeof window === 'undefined') return null;

  const absolute =
    raw.startsWith('blob:') || /^https?:\/\//i.test(raw)
      ? raw
      : new URL(raw, window.location.origin).toString();

  // Cache-bust so iOS doesn’t reuse a non-CORS cached response.
  const fetchUrl = absolute.startsWith('blob:')
    ? absolute
    : `${absolute}${absolute.includes('?') ? '&' : '?'}_story=${Date.now()}`;

  try {
    const res = await fetch(fetchUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await decodeBlobToJpegDataUrl(objectUrl, maxEdge);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Fallback: element decode (still needs CORS on the storage host).
    try {
      return await decodeBlobToJpegDataUrl(fetchUrl, maxEdge);
    } catch {
      return null;
    }
  }
}

function decodeBlobToJpegDataUrl(src: string, maxEdge: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    // Same-origin / blob / data URLs don’t need CORS; remote ones do for canvas export.
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous';
    }
    const done = (value: string | null) => resolve(value);
    img.onload = () => {
      try {
        const w = img.naturalWidth || 0;
        const h = img.naturalHeight || 0;
        if (w < 1 || h < 1) {
          done(null);
          return;
        }
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          done(null);
          return;
        }
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        done(null);
      }
    };
    img.onerror = () => done(null);
    img.src = src;
  });
}
