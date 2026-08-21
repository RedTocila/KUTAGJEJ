'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const publicCache = require('../middleware/public-cache');
const { loadPosterBrief, loadTrustBadgePosterIdSet, posterHasTrustBadge } = require('../lib/public-listings/load-poster-brief');
const {
  activeJobCreatedAtFilter,
  applyFilterSpec,
  isUuid,
  buildCityIndex,
  parsePagination,
  calcTotalPages,
  buildIlikeOrFilter,
} = require('../lib/public-listings/query-helpers');
const { namesMatch, normalizeSearchText } = require('../lib/search-normalize');
const { getReceivedReviewStats, resolveReferralBadges } = require('../lib/referrals');
const { reviewStatsByListingIds } = require('../lib/business-review-stats');
const { professionalReviewStatsByListingIds } = require('../lib/professional-review-stats');
const {
  formatRealEstate,
  formatCar,
  formatJob,
  formatMarketplace,
  formatDirectory,
} = require('../lib/public-listings/formatters');

const router = express.Router();

const LISTINGS_PER_VERTICAL = 48;
const MEMBER_SEARCH_FIELDS = [
  'first_name',
  'last_name',
  'business_name',
  'business_owner',
  'business_category',
  'based_city_name',
];

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

function memberSearchTokens(q) {
  const folded = normalizeSearchText(q);
  return folded.split(/[\s./-]+/).filter((token) => token.length >= 2).slice(0, 5);
}

function tableMissing(error) {
  return Boolean(
    error &&
      (error.code === '42P01' || /does not exist|schema cache/i.test(String(error.message || ''))),
  );
}

function citiesMatchingTerm(cities, term) {
  return (cities || []).filter((city) => namesMatch(term, city.name)).map((city) => city.id);
}

async function loadSearchCities() {
  const { data, error } = await getSupabaseAdmin().from('real_estate_cities').select('id, name');
  if (error) throw error;
  return data || [];
}

/** Aggregate member + directory-listing reviews for a page of profile hits. */
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

function formatSearchMember(row, extras) {
  const accountType = row.account_type === 'business' ? 'business' : 'individual';
  const reviews = extras.reviews.get(String(row.id)) || { reviewCount: 0, ratingAverage: null };
  return {
    id: row.id,
    kind: accountType,
    displayName: displayNameFromProfileRow(row),
    avatarUrl: String(row.avatar_url || '').trim() || null,
    memberSince: row.created_at,
    verified: Boolean(row.jobs_employer_verified_at || row.professionals_verified_at) || extras.verified.has(String(row.id)),
    trustBadge: extras.trusted.has(String(row.id)),
    businessOwner: accountType === 'business' ? String(row.business_owner || '').trim() || null : null,
    businessCategory: accountType === 'business' ? String(row.business_category || '').trim() || null : null,
    cityName: String(row.based_city_name || '').trim() || null,
    ratingAverage: reviews.ratingAverage,
    reviewCount: reviews.reviewCount,
  };
}

/**
 * GET /api/public/members — public individual/business profiles.
 * With `q` (min 2 chars): name/city/category search. Without `q`: latest members.
 * Never returns email, phone, or admin/managed accounts.
 */
router.get('/', publicCache(15), async (req, res) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const tokens = memberSearchTokens(req.query.q);

    let query = getSupabaseAdmin()
      .from('profiles')
      .select(
        'id, account_type, first_name, last_name, business_name, business_owner, business_category, avatar_url, created_at, based_city_id, based_city_name, jobs_employer_verified_at, professionals_verified_at',
        { count: 'exact' },
      )
      .in('account_type', ['individual', 'business'])
      .eq('is_active', true);

    if (tokens.length) {
      const cities = await loadSearchCities();
      for (const token of tokens) {
        const parts = [];
        const ilike = buildIlikeOrFilter(MEMBER_SEARCH_FIELDS, token);
        if (ilike) parts.push(ilike);
        for (const cityId of citiesMatchingTerm(cities, token)) {
          parts.push(`based_city_id.eq.${cityId}`);
        }
        if (!parts.length) {
          return res.json({ members: [], total: 0, page, limit, totalPages: 1 });
        }
        query = query.or(parts.join(','));
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
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
        .map((row) => String(row.id)),
    );

    const total = count ?? rows.length;
    return res.json({
      members: rows.map((row) => formatSearchMember(row, { trusted, verified, reviews })),
      total,
      page,
      limit,
      totalPages: calcTotalPages(total, limit),
    });
  } catch (e) {
    console.error('GET /api/public/members', e);
    return res.status(500).json({ error: 'Gabim serveri.' });
  }
});

async function attachPublicMetrics(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return listings;
  const ids = listings.map((l) => l.id).filter(Boolean);
  const kinds = [...new Set(listings.map((l) => l.kind).filter(Boolean))];
  const metricsByKey = new Map();
  if (ids.length && kinds.length) {
    const { data, error } = await getSupabaseAdmin()
      .from('listing_engagements')
      .select('listing_kind, listing_id, view_count, share_count')
      .in('listing_id', ids)
      .in('listing_kind', kinds);
    if (error) throw error;
    for (const row of data || []) {
      metricsByKey.set(`${row.listing_kind}:${row.listing_id}`, {
        viewCount: row.view_count || 0,
        shareCount: row.share_count || 0,
      });
    }
  }
  return listings.map((l) => {
    const m = metricsByKey.get(`${l.kind}:${l.id}`) || {
      viewCount: 0,
      shareCount: 0,
    };
    return { ...l, ...m, saveCount: 0 };
  });
}

async function loadMemberWithModel(id) {
  const individual = await loadPosterBrief('IndividualUser', id, null);
  if (individual) return { member: individual, posterModel: 'IndividualUser' };
  const business = await loadPosterBrief('BusinessUser', id, null);
  if (business) return { member: business, posterModel: 'BusinessUser' };
  return null;
}

async function fetchApproved(table, posterId, limit, extraSpec = {}) {
  const sb = getSupabaseAdmin();
  let q = sb
    .from(table)
    .select('*')
    .eq('poster_id', posterId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  q = applyFilterSpec(q, extraSpec);
  const { data, error } = await q;
  if (error) throw error;
  return camelizeRows(data);
}

async function countApproved(table, posterId, extraSpec = {}) {
  const sb = getSupabaseAdmin();
  let q = sb
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('poster_id', posterId)
    .eq('status', 'approved');
  q = applyFilterSpec(q, extraSpec);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function loadMemberListings(posterId) {
  const jobSpec = activeJobCreatedAtFilter();

  const [
    realEstateDocs,
    carDocs,
    jobDocs,
    marketplaceDocs,
    businessDocs,
    professionalDocs,
    realEstateTotal,
    carsTotal,
    jobsTotal,
    marketplaceTotal,
    businessesTotal,
    professionalsTotal,
  ] = await Promise.all([
    fetchApproved('real_estate_listings', posterId, LISTINGS_PER_VERTICAL),
    fetchApproved('car_listings', posterId, LISTINGS_PER_VERTICAL),
    fetchApproved('job_listings', posterId, LISTINGS_PER_VERTICAL, jobSpec),
    fetchApproved('marketplace_listings', posterId, LISTINGS_PER_VERTICAL),
    fetchApproved('directory_listings', posterId, LISTINGS_PER_VERTICAL, {
      eq: { vertical: 'businesses' },
    }),
    fetchApproved('directory_listings', posterId, LISTINGS_PER_VERTICAL, {
      eq: { vertical: 'professionals' },
    }),
    countApproved('real_estate_listings', posterId),
    countApproved('car_listings', posterId),
    countApproved('job_listings', posterId, jobSpec),
    countApproved('marketplace_listings', posterId),
    countApproved('directory_listings', posterId, { eq: { vertical: 'businesses' } }),
    countApproved('directory_listings', posterId, { eq: { vertical: 'professionals' } }),
  ]);

  const allDocs = [
    ...realEstateDocs,
    ...carDocs,
    ...jobDocs,
    ...marketplaceDocs,
    ...businessDocs,
    ...professionalDocs,
  ];
  const cityById = await buildCityIndex(allDocs);
  const [businessReviewStats, professionalReviewStats] = await Promise.all([
    reviewStatsByListingIds(businessDocs.map((d) => d.id)),
    professionalReviewStatsByListingIds(professionalDocs.map((d) => d.id)),
  ]);

  const [realEstate, cars, jobs, marketplace, businesses, professionals] = await Promise.all([
    attachPublicMetrics(realEstateDocs.map((d) => formatRealEstate(d, cityById))),
    attachPublicMetrics(carDocs.map((d) => formatCar(d, cityById))),
    attachPublicMetrics(jobDocs.map((d) => formatJob(d, cityById))),
    attachPublicMetrics(marketplaceDocs.map((d) => formatMarketplace(d, cityById))),
    attachPublicMetrics(
      businessDocs.map((d) => formatDirectory(d, cityById, businessReviewStats)),
    ),
    attachPublicMetrics(
      professionalDocs.map((d) => formatDirectory(d, cityById, professionalReviewStats)),
    ),
  ]);

  const totals = {
    realEstate: realEstateTotal,
    cars: carsTotal,
    jobs: jobsTotal,
    marketplace: marketplaceTotal,
    businesses: businessesTotal,
    professionals: professionalsTotal,
    all:
      realEstateTotal +
      carsTotal +
      jobsTotal +
      marketplaceTotal +
      businessesTotal +
      professionalsTotal,
  };

  return {
    realEstate,
    cars,
    jobs,
    marketplace,
    businesses,
    professionals,
    totals,
  };
}

/** GET /api/public/members/:id — public seller / member profile + active listings. */
router.get('/:id', publicCache(15), async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id || !isUuid(id)) {
      return res.status(404).json({ error: 'Profili nuk u gjet.' });
    }
    const loaded = await loadMemberWithModel(id);
    if (!loaded) return res.status(404).json({ error: 'Profili nuk u gjet.' });

    const [listings, badges, reviewStats] = await Promise.all([
      loadMemberListings(id),
      resolveReferralBadges(id, loaded.posterModel),
      getReceivedReviewStats(id, loaded.posterModel),
    ]);

    const sellerVerified = Boolean(loaded.member?.verified);
    const sellerTrustBadge = await posterHasTrustBadge(id);
    const stampVerified = (rows) =>
      (rows || []).map((row) => ({ ...row, sellerVerified, sellerTrustBadge }));
    listings.realEstate = stampVerified(listings.realEstate);
    listings.cars = stampVerified(listings.cars);
    listings.jobs = stampVerified(listings.jobs);
    listings.marketplace = stampVerified(listings.marketplace);
    listings.businesses = stampVerified(listings.businesses);
    listings.professionals = stampVerified(listings.professionals);

    return res.json({
      member: {
        ...loaded.member,
        trustBadge: sellerTrustBadge,
        ratingAverage: reviewStats.ratingAverage,
        reviewCount: reviewStats.reviewCount,
      },
      listings,
      badges,
    });
  } catch (e) {
    console.error('GET /api/public/members/:id', e);
    return res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
