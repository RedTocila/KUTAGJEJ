'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { camelizeRows } = require('../lib/profiles');
const publicCache = require('../middleware/public-cache');
const { loadPosterBrief, posterHasTrustBadge } = require('../lib/public-listings/load-poster-brief');
const {
  activeJobCreatedAtFilter,
  applyFilterSpec,
  isUuid,
  buildCityIndex,
} = require('../lib/public-listings/query-helpers');
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

async function attachPublicMetrics(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return listings;
  const ids = listings.map((l) => l.id).filter(Boolean);
  const kinds = [...new Set(listings.map((l) => l.kind).filter(Boolean))];
  const metricsByKey = new Map();
  if (ids.length && kinds.length) {
    const { data, error } = await getSupabaseAdmin()
      .from('listing_engagements')
      .select('listing_kind, listing_id, view_count, click_count, share_count')
      .in('listing_id', ids)
      .in('listing_kind', kinds);
    if (error) throw error;
    for (const row of data || []) {
      metricsByKey.set(`${row.listing_kind}:${row.listing_id}`, {
        viewCount: row.view_count || 0,
        clickCount: row.click_count || 0,
        shareCount: row.share_count || 0,
      });
    }
  }
  return listings.map((l) => {
    const m = metricsByKey.get(`${l.kind}:${l.id}`) || {
      viewCount: 0,
      clickCount: 0,
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
router.get('/:id', publicCache(), async (req, res) => {
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
