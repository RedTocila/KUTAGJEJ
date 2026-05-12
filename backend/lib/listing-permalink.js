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

module.exports = { listingPermalinkFromSlugSource };
