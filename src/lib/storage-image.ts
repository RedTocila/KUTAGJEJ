/**
 * Rewrite our Supabase public object URLs to the image transformation
 * endpoint so chat avatars / thumbs don't download multi‑MB originals.
 *
 * `/storage/v1/object/public/...` → `/storage/v1/render/image/public/...?width=&height=`
 * Non-Supabase URLs are returned unchanged.
 */
export function storageImageUrl(
  url: string | null | undefined,
  opts?: { width?: number; height?: number; resize?: 'cover' | 'contain' | 'fill'; quality?: number },
): string | undefined {
  const raw = String(url || '').trim();
  if (!raw) return undefined;

  const width = opts?.width ?? 96;
  const height = opts?.height ?? width;
  const resize = opts?.resize ?? 'cover';
  const quality = opts?.quality ?? 70;

  try {
    const parsed = new URL(raw);
    const marker = '/storage/v1/object/public/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return raw;

    parsed.pathname =
      `${parsed.pathname.slice(0, idx)}/storage/v1/render/image/public/` +
      parsed.pathname.slice(idx + marker.length);
    parsed.search = '';
    parsed.searchParams.set('width', String(Math.max(1, Math.round(width))));
    parsed.searchParams.set('height', String(Math.max(1, Math.round(height))));
    parsed.searchParams.set('resize', resize);
    parsed.searchParams.set(
      'quality',
      String(Math.min(100, Math.max(1, Math.round(quality)))),
    );
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
