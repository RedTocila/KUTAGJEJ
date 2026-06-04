const BusinessListingReview = require('../models/BusinessListingReview');

async function reviewStatsByListingIds(listingIds) {
  const ids = listingIds.filter(Boolean);
  if (ids.length === 0) return new Map();

  const rows = await BusinessListingReview.aggregate([
    { $match: { listingId: { $in: ids } } },
    {
      $group: {
        _id: '$listingId',
        count: { $sum: 1 },
        avg: { $avg: '$rating' },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), {
      reviewCount: row.count,
      ratingAverage: row.count > 0 ? Math.round(row.avg * 10) / 10 : null,
    });
  }
  return map;
}

module.exports = { reviewStatsByListingIds };
