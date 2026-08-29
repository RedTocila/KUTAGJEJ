const { slugifyTitle } = require('./real-estate-permalink');

/**
 * Canonical public segment `{slug}-{mongoId}.html` — same parsing as real estate
 * (`mongoIdFromRealEstatePermalink` in backend / `mongoIdFromPublicListingSegment` on frontend).
 */
function listingPermalinkFromSlugSource(slugSource, mongoId) {
  const id = mongoId != null ? String(mongoId) : '';
  const segment = `${slugifyTitle(slugSource)}-${id}.html`;
  return typeof segment.normalize === 'function' ? segment.normalize('NFC') : segment;
}

function listingPermalinkFromDoc(doc, slugSource) {
  const id = doc?.id != null ? String(doc.id) : doc?._id != null ? String(doc._id) : '';
  const storedSlug = String(doc?.permalinkSlug ?? doc?.permalink_slug ?? '').trim();
  if (storedSlug) {
    const segment = `${storedSlug.replace(/\.html$/i, '')}-${id}.html`;
    return typeof segment.normalize === 'function' ? segment.normalize('NFC') : segment;
  }
  return listingPermalinkFromSlugSource(slugSource, id);
}

module.exports = { listingPermalinkFromSlugSource, listingPermalinkFromDoc };
