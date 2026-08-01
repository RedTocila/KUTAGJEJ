const express = require('express');
const mongoose = require('mongoose');
const publicCache = require('../middleware/public-cache');
const { loadPosterBrief } = require('../lib/public-listings/load-poster-brief');
const { activeJobCreatedAtFilter } = require('../lib/public-listings/query-helpers');
const { resolveReferralBadges } = require('../lib/referrals');
const {
  queryRealEstate,
  countRealEstate,
  queryCars,
  countCars,
  queryJobs,
  countJobs,
  queryMarketplace,
  countMarketplace,
  queryDirectory,
  countDirectory,
} = require('../lib/public-listings/latest-queries');

const router = express.Router();

const LISTINGS_PER_VERTICAL = 48;

async function loadMemberWithModel(id) {
  const individual = await loadPosterBrief('IndividualUser', id, null);
  if (individual) return { member: individual, posterModel: 'IndividualUser' };
  const business = await loadPosterBrief('BusinessUser', id, null);
  if (business) return { member: business, posterModel: 'BusinessUser' };
  return null;
}

async function loadMemberListings(posterId, posterModel) {
  const posterFilter = { posterId, posterModel };
  const jobFilter = { ...activeJobCreatedAtFilter(), ...posterFilter };

  const [
    realEstate,
    cars,
    jobs,
    marketplace,
    businesses,
    professionals,
    realEstateTotal,
    carsTotal,
    jobsTotal,
    marketplaceTotal,
    businessesTotal,
    professionalsTotal,
  ] = await Promise.all([
    queryRealEstate(LISTINGS_PER_VERTICAL, posterFilter),
    queryCars(LISTINGS_PER_VERTICAL, posterFilter),
    queryJobs(LISTINGS_PER_VERTICAL, jobFilter),
    queryMarketplace(LISTINGS_PER_VERTICAL, posterFilter),
    queryDirectory('businesses', LISTINGS_PER_VERTICAL, { vertical: 'businesses', ...posterFilter }),
    queryDirectory('professionals', LISTINGS_PER_VERTICAL, { vertical: 'professionals', ...posterFilter }),
    countRealEstate(posterFilter),
    countCars(posterFilter),
    countJobs(jobFilter),
    countMarketplace(posterFilter),
    countDirectory({ vertical: 'businesses', ...posterFilter }),
    countDirectory({ vertical: 'professionals', ...posterFilter }),
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
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Profili nuk u gjet.' });
    }
    const loaded = await loadMemberWithModel(id);
    if (!loaded) return res.status(404).json({ error: 'Profili nuk u gjet.' });

    const [listings, badges] = await Promise.all([
      loadMemberListings(id, loaded.posterModel),
      resolveReferralBadges(id, loaded.posterModel),
    ]);
    return res.json({ member: loaded.member, listings, badges });
  } catch (e) {
    console.error('GET /api/public/members/:id', e);
    return res.status(500).json({ error: 'Gabim serveri.' });
  }
});

module.exports = router;
