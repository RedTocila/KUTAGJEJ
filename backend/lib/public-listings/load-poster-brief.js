const { getProfileById } = require('../profiles');
const { isJobsEmployerVerified } = require('../job-employer-verification');
const { isProfessionalVerified } = require('../professional-verification');
const { getReceivedReviewStats } = require('../referrals');

/** @param {'jobs'|'professionals'|null} verifiedContext — `null` = any verification badge. */
function resolveVerified(profile, verifiedContext) {
  if (verifiedContext === 'professionals') return isProfessionalVerified(profile);
  if (verifiedContext === 'jobs') return isJobsEmployerVerified(profile);
  return isJobsEmployerVerified(profile) || isProfessionalVerified(profile);
}

async function withReviewStats(brief) {
  if (!brief?.id) return brief;
  try {
    const stats = await getReceivedReviewStats(brief.id);
    return {
      ...brief,
      ratingAverage: stats.ratingAverage,
      reviewCount: stats.reviewCount,
    };
  } catch (e) {
    console.warn('loadPosterBrief reviews:', e?.message || e);
    return { ...brief, ratingAverage: null, reviewCount: 0 };
  }
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
      return withReviewStats({
        id: profile.id,
        kind: 'business',
        displayName,
        phone: profile.phone?.trim() || null,
        avatarUrl: profile.avatarUrl?.trim() || null,
        memberSince: profile.createdAt,
        verified: resolveVerified(profile, verifiedContext),
        businessOwner: profile.businessOwner?.trim() || null,
        businessCategory: profile.businessCategory?.trim() || null,
      });
    }

    const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() || null;
    return withReviewStats({
      id: profile.id,
      kind: 'individual',
      displayName,
      phone: profile.phone?.trim() || null,
      avatarUrl: profile.avatarUrl?.trim() || null,
      memberSince: profile.createdAt,
      verified: resolveVerified(profile, verifiedContext),
      businessOwner: null,
      businessCategory: null,
    });
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
    return null;
  }
}

module.exports = { loadPosterBrief };
