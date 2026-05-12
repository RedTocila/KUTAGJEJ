/** Parse `{slug}-{mongoId}.html`; mirrors `backend/lib/real-estate-permalink.js`. */

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Decode `%`-encoding safely (handles already-decoded Next params). */
function safeDecodePathSegment(seg: string): string {
  let s = String(seg ?? '').trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep segment as-is */
  }
  try {
    s = decodeURIComponent(s);
  } catch {
    /* single decode was enough */
  }
  return s;
}

/** Compare listing URLs reliably across NFC/NFD unicode. */
export function normalizeListingPermalinkSegment(segment: string): string {
  return safeDecodePathSegment(segment).normalize('NFC').trim();
}

export function mongoIdFromRealEstatePermalink(segment: string): string | null {
  const raw = normalizeListingPermalinkSegment(segment);
  if (!raw.toLowerCase().endsWith('.html')) return null;
  const sans = raw.slice(0, -('.html'.length));
  const lastDash = sans.lastIndexOf('-');
  if (lastDash < 0 || lastDash >= sans.length - 1) return null;
  const id = sans.slice(lastDash + 1);
  return OBJECT_ID.test(id) ? id.toLowerCase() : null;
}

/** Resolves mongo id from `/prona/{permalink}` segment (`.html` or legacy bare ObjectId). */
export function mongoIdFromPronaDynamicSegment(segment: string): string | null {
  const raw = normalizeListingPermalinkSegment(segment);
  if (OBJECT_ID.test(raw)) return raw.toLowerCase();
  return mongoIdFromRealEstatePermalink(raw);
}

/** Alias: same `{slug}-{mongoId}.html` or legacy bare ObjectId for all browse verticals. */
export function mongoIdFromPublicListingSegment(segment: string): string | null {
  return mongoIdFromPronaDynamicSegment(segment);
}
