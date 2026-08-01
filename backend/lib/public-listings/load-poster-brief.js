const mongoose = require('mongoose');
const IndividualUser = require('../../models/IndividualUser');
const BusinessUser = require('../../models/BusinessUser');
const { isJobsEmployerVerified } = require('../job-employer-verification');
const { isProfessionalVerified } = require('../professional-verification');

/** @param {'jobs'|'professionals'|null} verifiedContext — `null` = any verification badge. */
function resolveVerified(u, verifiedContext) {
  if (verifiedContext === 'professionals') return isProfessionalVerified(u);
  if (verifiedContext === 'jobs') return isJobsEmployerVerified(u);
  return isJobsEmployerVerified(u) || isProfessionalVerified(u);
}

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
      return {
        id: String(u._id),
        kind: 'individual',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
        verified: resolveVerified(u, verifiedContext),
        businessOwner: null,
        businessCategory: null,
      };
    }
    if (posterModel === 'BusinessUser') {
      const u = await BusinessUser.findById(posterId)
        .select(
          'firstName lastName phone createdAt businessName businessOwner businessCategory jobsEmployerVerifiedAt professionalsVerifiedAt',
        )
        .lean();
      if (!u) return null;
      const displayName =
        (u.businessName && String(u.businessName).trim()) ||
        (u.businessOwner && String(u.businessOwner).trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        null;
      return {
        id: String(u._id),
        kind: 'business',
        displayName,
        phone: u.phone?.trim() || null,
        memberSince: u.createdAt,
        verified: resolveVerified(u, verifiedContext),
        businessOwner: u.businessOwner?.trim() || null,
        businessCategory: u.businessCategory?.trim() || null,
      };
    }
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
  }
  return null;
}

module.exports = { loadPosterBrief };
