/** Parse `{slug}-{uuid}.html`; mirrors `backend/lib/real-estate-permalink.js`. */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const UUID_FULL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** Extract listing id from `anything-{uuid}.html` (SEO URL segment). */
export function mongoIdFromRealEstatePermalink(segment: string): string | null {
  const raw = normalizeListingPermalinkSegment(segment);
  const lower = raw.toLowerCase();
  if (!lower.endsWith('.html')) return null;
  const sans = raw.slice(0, -'.html'.length);
  const match = sans.match(new RegExp(`(${UUID_RE.source})$`, 'i'));
  if (match?.[1]) return match[1].toLowerCase();

  // Legacy Mongo ObjectId: `{slug}-{24hex}.html`
  const lastDash = sans.lastIndexOf('-');
  if (lastDash < 0 || lastDash >= sans.length - 1) return null;
  const id = sans.slice(lastDash + 1);
  return OBJECT_ID_RE.test(id) ? id.toLowerCase() : null;
}

/** Resolves listing id from `/prona/{permalink}` segment (`.html` or legacy bare id). */
export function mongoIdFromPronaDynamicSegment(segment: string): string | null {
  const raw = normalizeListingPermalinkSegment(segment);
  if (UUID_FULL_RE.test(raw) || OBJECT_ID_RE.test(raw)) return raw.toLowerCase();
  return mongoIdFromRealEstatePermalink(raw);
}

/** Alias: same `{slug}-{id}.html` or legacy bare id for all browse verticals. */
export function mongoIdFromPublicListingSegment(segment: string): string | null {
  return mongoIdFromPronaDynamicSegment(segment);
}

/** True when `id` is a UUID or legacy 24-char ObjectId. */
export function isListingId(id: string): boolean {
  const raw = String(id ?? '').trim();
  return UUID_FULL_RE.test(raw) || OBJECT_ID_RE.test(raw);
}
