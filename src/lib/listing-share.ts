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

function isAlreadyProxied(url: string): boolean {
  return /\/api\/public\/image-proxy(?:\?|$)/i.test(url);
}

/**
 * Same-origin story photo URL. Remote CDNs often block canvas/CORS and Instagram
 * hotlinking; the API proxy returns the bytes from kutagjej so `<img>` + capture work.
 */
export function resolveStoryImageSrc(url: string | null | undefined): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:') || raw.startsWith('blob:') || isAlreadyProxied(raw)) return raw;
  if (raw.startsWith('/')) return raw;

  const absolute = /^https?:\/\//i.test(raw)
    ? raw
    : typeof window !== 'undefined'
      ? new URL(raw, window.location.origin).toString()
      : null;
  if (!absolute) return raw;

  try {
    const parsed = new URL(absolute);
    if (typeof window !== 'undefined' && parsed.origin === window.location.origin) return absolute;
  } catch {
    return raw;
  }

  return `/api/public/image-proxy?url=${encodeURIComponent(absolute)}`;
}

/**
 * Inline a remote image as a JPEG data URL for html-to-image / canvas export.
 * Prefers the same-origin proxy so Safari / Instagram CDNs don't blank the photo.
 */
export async function embedImageAsDataUrl(url: string, maxEdge = 1400): Promise<string | null> {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:image/')) return raw;
  if (typeof window === 'undefined') return null;

  const candidates: string[] = [];
  const proxied = resolveStoryImageSrc(raw);
  if (proxied) candidates.push(proxied);
  if (raw.startsWith('blob:') || /^https?:\/\//i.test(raw) || raw.startsWith('/')) {
    const absolute =
      raw.startsWith('blob:') || /^https?:\/\//i.test(raw)
        ? raw
        : new URL(raw, window.location.origin).toString();
    if (!candidates.includes(absolute)) candidates.push(absolute);
  }

  for (const candidate of candidates) {
    const embedded = await tryEmbedImage(candidate, maxEdge);
    if (embedded) return embedded;
  }
  return null;
}

async function tryEmbedImage(src: string, maxEdge: number): Promise<string | null> {
  try {
    const res = await fetch(src, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = (blob.type || '').toLowerCase();
    if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
      return null;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await decodeBlobToJpegDataUrl(objectUrl, maxEdge);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    try {
      return await decodeBlobToJpegDataUrl(src, maxEdge);
    } catch {
      return null;
    }
  }
}

function decodeBlobToJpegDataUrl(src: string, maxEdge: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    const sameOrigin =
      src.startsWith('blob:') ||
      src.startsWith('data:') ||
      src.startsWith('/') ||
      (typeof window !== 'undefined' && src.startsWith(`${window.location.origin}/`));
    if (!sameOrigin && /^https?:\/\//i.test(src)) {
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
