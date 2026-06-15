const mongoose = require('mongoose');
const IndividualUser = require('../../models/IndividualUser');
const BusinessUser = require('../../models/BusinessUser');
const { isJobsEmployerVerified } = require('../job-employer-verification');
const { isProfessionalVerified } = require('../professional-verification');

/** @param {'jobs'|'professionals'|null} verifiedContext */
async function loadPosterBrief(posterModel, posterId, verifiedContext = 'jobs') {
  try {
    if (!posterId || !mongoose.Types.ObjectId.isValid(posterId)) return null;
    if (posterModel === 'IndividualUser') {
      const u = await IndividualUser.findById(posterId)
        .select('firstName lastName phone createdAt jobsEmployerVerifiedAt professionalsVerifiedAt')
        .lean();
      if (!u) return null;
      const displayName =
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || null;
      const verified =
        verifiedContext === 'professionals'
          ? isProfessionalVerified(u)
          : verifiedContext === 'jobs'
            ? isJobsEmployerVerified(u)
            : false;
      return {
        kind: 'individual',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
        verified,
      };
    }
    if (posterModel === 'BusinessUser') {
      const u = await BusinessUser.findById(posterId)
        .select(
          'firstName lastName phone createdAt businessName businessOwner jobsEmployerVerifiedAt professionalsVerifiedAt',
        )
        .lean();
      if (!u) return null;
      const displayName =
        (u.businessName && String(u.businessName).trim()) ||
        (u.businessOwner && String(u.businessOwner).trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        null;
      const verified =
        verifiedContext === 'professionals'
          ? isProfessionalVerified(u)
          : verifiedContext === 'jobs'
            ? isJobsEmployerVerified(u)
            : false;
      return {
        kind: 'business',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
        verified,
      };
    }
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
  }
  return null;
}

module.exports = { loadPosterBrief };
