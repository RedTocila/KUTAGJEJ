const MAX_SLUG_LEN = 80;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * URL-safe slug from listing title for public detail URLs:
 * `{slug}-{id}.html`
 */
function slugifyTitle(title) {
  let s = String(title ?? '').trim().toLowerCase();
  if (!s) return 'njofte';
  s = s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_SLUG_LEN);
  return s || 'njofte';
}

function realEstatePermalink(doc) {
  const id = doc?.id != null ? String(doc.id) : doc?._id != null ? String(doc._id) : '';
  const storedSlug = String(doc?.permalinkSlug ?? doc?.permalink_slug ?? '').trim();
  const segment = storedSlug
    ? `${storedSlug.replace(/\.html$/i, '')}-${id}.html`
    : `${slugifyTitle(doc.title)}-${id}.html`;
  // Match browser URL normalization (matches UTF-8 path segments reliably).
  return typeof segment.normalize === 'function' ? segment.normalize('NFC') : segment;
}

/** Extract `{ id }` from `anything-{uuid}.html` (SEO URL segment). */
function mongoIdFromRealEstatePermalink(segment) {
  const raw = String(segment ?? '').trim();
  const lower = raw.toLowerCase();
  if (!lower.endsWith('.html')) return null;
  const sans = raw.slice(0, -'.html'.length);
  const match = sans.match(new RegExp(`(${UUID_RE.source})$`, 'i'));
  return match ? match[1] : null;
}

module.exports = { slugifyTitle, realEstatePermalink, mongoIdFromRealEstatePermalink };
