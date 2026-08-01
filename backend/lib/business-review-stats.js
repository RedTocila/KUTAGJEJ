const { getSupabaseAdmin } = require('./supabase');

async function reviewStatsByListingIds(listingIds) {
  const ids = [...new Set((listingIds || []).filter(Boolean).map(String))];
  if (ids.length === 0) return new Map();

  const { data, error } = await getSupabaseAdmin()
    .from('business_listing_reviews')
    .select('listing_id, rating')
    .in('listing_id', ids);
  if (error) throw error;

  const sums = new Map();
  for (const row of data || []) {
    const entry = sums.get(row.listing_id) || { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(row.rating) || 0;
    sums.set(row.listing_id, entry);
  }

  const map = new Map();
  for (const [id, entry] of sums.entries()) {
    map.set(id, {
      reviewCount: entry.count,
      ratingAverage: entry.count > 0 ? Math.round((entry.total / entry.count) * 10) / 10 : null,
    });
  }
  return map;
}

module.exports = { reviewStatsByListingIds };
