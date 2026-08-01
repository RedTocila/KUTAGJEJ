const { getProfileById } = require('../profiles');
const { isJobsEmployerVerified } = require('../job-employer-verification');
const { isProfessionalVerified } = require('../professional-verification');

/** @param {'jobs'|'professionals'|null} verifiedContext — `null` = any verification badge. */
function resolveVerified(profile, verifiedContext) {
  if (verifiedContext === 'professionals') return isProfessionalVerified(profile);
  if (verifiedContext === 'jobs') return isJobsEmployerVerified(profile);
  return isJobsEmployerVerified(profile) || isProfessionalVerified(profile);
}

/**
 * @param {string|null} _posterModelHint unused — kept for call-site compatibility;
 *   the poster kind is derived from `profiles.account_type`.
 * @param {'jobs'|'professionals'|null} verifiedContext
 */
async function loadPosterBrief(_posterModelHint, posterId, verifiedContext = 'jobs') {
  try {
    const profile = await getProfileById(posterId);
    if (!profile) return null;
    if (profile.accountType !== 'individual' && profile.accountType !== 'business') return null;

    if (profile.accountType === 'business') {
      const displayName =
        (profile.businessName && String(profile.businessName).trim()) ||
        (profile.businessOwner && String(profile.businessOwner).trim()) ||
        `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        null;
      return {
        id: profile.id,
        kind: 'business',
        displayName,
        phone: profile.phone?.trim() || null,
        memberSince: profile.createdAt,
        verified: resolveVerified(profile, verifiedContext),
        businessOwner: profile.businessOwner?.trim() || null,
        businessCategory: profile.businessCategory?.trim() || null,
      };
    }

    const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() || null;
    return {
      id: profile.id,
      kind: 'individual',
      displayName,
      phone: profile.phone?.trim() || null,
      memberSince: profile.createdAt,
      verified: resolveVerified(profile, verifiedContext),
      businessOwner: null,
      businessCategory: null,
    };
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
    return null;
  }
}

module.exports = { loadPosterBrief };
