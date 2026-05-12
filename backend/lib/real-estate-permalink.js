const mongoose = require('mongoose');

const MAX_SLUG_LEN = 80;

/**
 * URL-safe slug from listing title for public detail URLs:
 * `{slug}-{mongoId}.html`
 */
function slugifyTitle(title) {
  let s = String(title ?? '').trim().toLowerCase();
  if (!s) return 'njofte';
  s = s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_SLUG_LEN);
  return s || 'njofte';
}

function realEstatePermalink(doc) {
  const id = doc?._id != null ? String(doc._id) : '';
  const segment = `${slugifyTitle(doc.title)}-${id}.html`;
  // Match browser URL normalization (matches UTF-8 path segments reliably).
  return typeof segment.normalize === 'function' ? segment.normalize('NFC') : segment;
}

/** Extract `{ id }` from `anything-{ObjectId}.html` (SEO URL segment). */
function mongoIdFromRealEstatePermalink(segment) {
  const raw = String(segment ?? '').trim();
  const lower = raw.toLowerCase();
  if (!lower.endsWith('.html')) return null;
  const sans = raw.slice(0, -('.html'.length));
  const lastDash = sans.lastIndexOf('-');
  if (lastDash < 0 || lastDash >= sans.length - 1) return null;
  const id = sans.slice(lastDash + 1);
  return mongoose.isValidObjectId(id) ? id : null;
}

module.exports = { slugifyTitle, realEstatePermalink, mongoIdFromRealEstatePermalink };
