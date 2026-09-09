'use strict';

/**
 * Combined public homepage payload — one HTTP response for Next.js SSR.
 * Listings share enrichment; banners + members load in parallel.
 */

const { getSupabaseAdmin } = require('./supabase');
const { camelizeRows } = require('./profiles');
const { getCached, setCached } = require('./public-listings-cache');
const { clampLimit, calcTotalPages } = require('./public-listings/query-helpers');
const { queryHomepageListings, countRealEstate, countCars, countActiveJobs, countMarketplace, countDirectory } = require('./public-listings/latest-queries');
const { loadTrustBadgePosterIdSet } = require('./public-listings/load-poster-brief');

const BANNER_SELECT =
  'id, title, subtitle, image_url, cta_label, cta_href, order, created_at, is_active';

const MEMBER_SELECT =
  'id, account_type, first_name, last_name, business_name, business_owner, business_category, avatar_url, created_at, based_city_id, based_city_name, jobs_employer_verified_at, professionals_verified_at, is_private';

function tableMissing(error) {
  return Boolean(
    error && (error.code === '42P01' || /does not exist|schema cache/i.test(String(error.message || '')))
  );
}

function displayNameFromProfileRow(row) {
  if (row.account_type === 'business') {
    return (
      String(row.business_name || '').trim() ||
      String(row.business_owner || '').trim() ||
      `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
      null
    );
  }
  return `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() || null;
}

async function reviewStatsByMemberIds(memberIds) {
  const stats = new Map();
  const ids = [...new Set((memberIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return stats;

  const sb = getSupabaseAdmin();
  const addRating = (memberId, rating) => {
    const key = String(memberId || '');
    if (!key) return;
    const cur = stats.get(key) || { sum: 0, count: 0 };
    cur.sum += Number(rating) || 0;
    cur.count += 1;
    stats.set(key, cur);
  };

  const [memberRes, listingsRes] = await Promise.all([
    sb.from('member_reviews').select('member_id, rating').in('member_id', ids),
    sb.from('directory_listings').select('id, poster_id').in('poster_id', ids),
  ]);
  if (memberRes.error && !tableMissing(memberRes.error)) throw memberRes.error;
  if (listingsRes.error && !tableMissing(listingsRes.error)) throw listingsRes.error;

  for (const row of memberRes.data || []) addRating(row.member_id, row.rating);

  const listings = listingsRes.data || [];
  const listingIds = listings.map((row) => row.id).filter(Boolean);
  const posterByListing = new Map(listings.map((row) => [String(row.id), String(row.poster_id)]));

  if (listingIds.length) {
    const [businessRes, professionalRes] = await Promise.all([
      sb.from('business_listing_reviews').select('listing_id, rating').in('listing_id', listingIds),
      sb.from('professional_listing_reviews').select('listing_id, rating').in('listing_id', listingIds),
    ]);
    if (businessRes.error && !tableMissing(businessRes.error)) throw businessRes.error;
    if (professionalRes.error && !tableMissing(professionalRes.error)) throw professionalRes.error;
    for (const row of [...(businessRes.data || []), ...(professionalRes.data || [])]) {
      addRating(posterByListing.get(String(row.listing_id)), row.rating);
    }
  }

  const out = new Map();
  for (const [id, cur] of stats) {
    out.set(id, {
      reviewCount: cur.count,
      ratingAverage: cur.count ? Math.round((cur.sum / cur.count) * 10) / 10 : null,
    });
  }
  return out;
}

function formatBanner(row) {
  const c = camelizeRows([row])[0];
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle || '',
    imageUrl: c.imageUrl,
    ctaLabel: c.ctaLabel || '',
    ctaHref: c.ctaHref || '',
    order: Number(c.order || 0),
  };
}

function formatSearchMember(row, extras) {
  const accountType = row.account_type === 'business' ? 'business' : 'individual';
  const reviews = extras.reviews.get(String(row.id)) || { reviewCount: 0, ratingAverage: null };
  return {
    id: row.id,
    kind: accountType,
    displayName: displayNameFromProfileRow(row),
    avatarUrl: String(row.avatar_url || '').trim() || null,
    memberSince: row.created_at,
    verified:
      Boolean(row.jobs_employer_verified_at || row.professionals_verified_at) ||
      extras.verified.has(String(row.id)),
    trustBadge: extras.trusted.has(String(row.id)),
    businessOwner: accountType === 'business' ? String(row.business_owner || '').trim() || null : null,
    businessCategory: accountType === 'business' ? String(row.business_category || '').trim() || null : null,
    cityName: String(row.based_city_name || '').trim() || null,
    ratingAverage: reviews.ratingAverage,
    reviewCount: reviews.reviewCount,
  };
}

async function loadHomeBanners() {
  const { data, error } = await getSupabaseAdmin()
    .from('home_banners')
    .select(BANNER_SELECT)
    .eq('is_active', true)
    .order('order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((d) => formatBanner(d));
}

async function loadLatestMembers(limit) {
  const { data, error, count } = await getSupabaseAdmin()
    .from('profiles')
    .select(MEMBER_SELECT, { count: 'exact' })
    .in('account_type', ['individual', 'business'])
    .eq('is_active', true)
    .neq('is_private', true)
    .order('created_at', { ascending: false })
    .range(0, limit - 1);
  if (error) throw error;

  const rows = data || [];
  const ids = rows.map((row) => row.id).filter(Boolean);
  const [trusted, reviews] = await Promise.all([
    loadTrustBadgePosterIdSet(ids),
    reviewStatsByMemberIds(ids),
  ]);
  const verified = new Set(
    rows
      .filter((row) => row.jobs_employer_verified_at || row.professionals_verified_at)
      .map((row) => String(row.id))
  );

  const total = count ?? rows.length;
  return {
    members: rows.map((row) => formatSearchMember(row, { trusted, verified, reviews })),
    total,
    page: 1,
    limit,
    totalPages: calcTotalPages(total, limit),
  };
}

/**
 * Full public homepage DTO for Next.js ISR.
 * Cached in-process for 300s (same TTL as other public listing caches).
 */
async function getHomepageBundle(rawLimit) {
  const limit = clampLimit(rawLimit);
  const cacheKey = `homepage-bundle:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [listings, banners, membersPage, totals] = await Promise.all([
    queryHomepageListings(limit),
    loadHomeBanners().catch((err) => {
      console.error('homepage banners:', err?.message || err);
      return [];
    }),
    loadLatestMembers(limit).catch((err) => {
      console.error('homepage members:', err?.message || err);
      return { members: [], total: 0, page: 1, limit, totalPages: 1 };
    }),
    Promise.all([
      countRealEstate(),
      countCars(),
      countActiveJobs(),
      countMarketplace(),
      countDirectory({ eq: { vertical: 'businesses' } }),
      countDirectory({ eq: { vertical: 'professionals' } }),
    ])
      .then(([realEstate, cars, jobs, marketplace, businesses, professionals]) => ({
        realEstate,
        cars,
        jobs,
        marketplace,
        businesses,
        professionals,
      }))
      .catch((err) => {
        console.error('homepage totals:', err?.message || err);
        return {
          realEstate: 0,
          cars: 0,
          jobs: 0,
          marketplace: 0,
          businesses: 0,
          professionals: 0,
        };
      }),
  ]);

  const payload = {
    banners,
    realEstate: listings.realEstate || [],
    cars: listings.cars || [],
    jobs: listings.jobs || [],
    marketplace: listings.marketplace || [],
    businesses: listings.businesses || [],
    professionals: listings.professionals || [],
    okazion: listings.okazion || [],
    okazionTotal: listings.okazionTotal || 0,
    members: membersPage.members || [],
    membersTotal: membersPage.total || 0,
    totals,
  };

  setCached(cacheKey, payload);
  return payload;
}

module.exports = { getHomepageBundle };
