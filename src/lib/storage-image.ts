/**
 * Rewrite our Supabase public object URLs to the image transformation
 * endpoint so cards / banners / thumbs don't download multi‑MB originals.
 *
 * `/storage/v1/object/public/...` → `/storage/v1/render/image/public/...?width=&height=`
 * Non-Supabase URLs are returned unchanged.
 */

type StorageResize = 'cover' | 'contain' | 'fill';

export type StorageImageOpts = {
  width?: number;
  height?: number;
  resize?: StorageResize;
  quality?: number;
};

export function storageImageUrl(url: string | null | undefined, opts?: StorageImageOpts): string | undefined {
  const raw = String(url || '').trim();
  if (!raw) return undefined;

  const width = opts?.width ?? 96;
  const height = opts?.height ?? width;
  const resize = opts?.resize ?? 'cover';
  const quality = opts?.quality ?? 70;

  try {
    const parsed = new URL(raw);
    const renderMarker = '/storage/v1/render/image/public/';
    const objectMarker = '/storage/v1/object/public/';
    const renderIdx = parsed.pathname.indexOf(renderMarker);
    const objectIdx = parsed.pathname.indexOf(objectMarker);

    if (renderIdx === -1 && objectIdx === -1) return raw;

    if (objectIdx !== -1) {
      parsed.pathname =
        `${parsed.pathname.slice(0, objectIdx)}${renderMarker}` +
        parsed.pathname.slice(objectIdx + objectMarker.length);
    }

    parsed.search = '';
    parsed.searchParams.set('width', String(Math.max(1, Math.round(width))));
    parsed.searchParams.set('height', String(Math.max(1, Math.round(height))));
    parsed.searchParams.set('resize', resize);
    parsed.searchParams.set('quality', String(Math.min(100, Math.max(1, Math.round(quality)))));
    return parsed.toString();
  } catch {
    return raw;
  }
}

function sizedOrOriginal(url: string | null | undefined, opts: StorageImageOpts): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  return storageImageUrl(raw, opts) ?? raw;
}

/** Card / grid covers (~2× a mobile column). Falls back to original if not Supabase. */
export function listingCardImageUrl(url: string | null | undefined): string | null {
  return sizedOrOriginal(url, { width: 640, height: 400, resize: 'cover', quality: 68 });
}

/** Homepage hero banner (LCP). */
export function homeBannerImageUrl(url: string | null | undefined): string | null {
  return sizedOrOriginal(url, { width: 1200, height: 900, resize: 'cover', quality: 70 });
}

/** Listing detail gallery hero. */
export function listingHeroImageUrl(url: string | null | undefined): string | null {
  return sizedOrOriginal(url, { width: 1080, height: 810, resize: 'cover', quality: 72 });
}

/** Gallery filmstrip / small tiles. */
export function listingThumbImageUrl(url: string | null | undefined): string | null {
  return sizedOrOriginal(url, { width: 176, height: 128, resize: 'cover', quality: 65 });
}

/** Seller / chat avatars. */
export function avatarImageUrl(url: string | null | undefined, size = 128): string | null {
  return sizedOrOriginal(url, { width: size, height: size, resize: 'cover', quality: 70 });
}

/** Strip transform params so callers can fall back to the full object URL. */
export function storageImageOriginalUrl(url: string | null | undefined): string | null {
  const raw = String(url || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const renderMarker = '/storage/v1/render/image/public/';
    const idx = parsed.pathname.indexOf(renderMarker);
    if (idx === -1) return raw;
    parsed.pathname =
      `${parsed.pathname.slice(0, idx)}/storage/v1/object/public/` + parsed.pathname.slice(idx + renderMarker.length);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return raw;
  }
}

/** Prefetch so inbox / thread avatars paint from cache. */
export function prefetchStorageImages(urls: Array<string | null | undefined>): void {
  if (typeof window === 'undefined') return;
  const seen = new Set<string>();
  for (const url of urls) {
    const src = storageImageUrl(url, { width: 96, height: 96 });
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}
