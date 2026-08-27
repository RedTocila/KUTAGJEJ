const { getSupabaseAdmin } = require('../supabase');
const { getProfileById } = require('../profiles');
const { isJobsEmployerVerified } = require('../job-employer-verification');
const { isProfessionalVerified } = require('../professional-verification');
const { getReceivedReviewStats } = require('../referrals');
const { hasContactRelationship } = require('../profile-privacy');

/** @param {'jobs'|'professionals'|null} verifiedContext — `null` = account verification (any). */
function resolveVerified(profile, verifiedContext) {
  if (verifiedContext === 'professionals') return isProfessionalVerified(profile);
  if (verifiedContext === 'jobs') return isJobsEmployerVerified(profile);
  return isJobsEmployerVerified(profile) || isProfessionalVerified(profile);
}

/** Batch-resolve which poster ids have an account verification badge. */
async function loadVerifiedPosterIdSet(posterIds) {
  const ids = [...new Set((posterIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Set();

  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, jobs_employer_verified_at, professionals_verified_at')
    .in('id', ids);
  if (error) throw error;

  const verified = new Set();
  for (const row of data || []) {
    if (row.jobs_employer_verified_at || row.professionals_verified_at) {
      verified.add(String(row.id));
    }
  }
  return verified;
}

/**
 * Poster ids with an active Grow or Elite subscription (Premium Badge on listing titles).
 * Starter / Free never qualify — even if an old snapshot had glow_badge_enabled.
 */
async function loadTrustBadgePosterIdSet(posterIds) {
  const ids = [...new Set((posterIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Set();

  const nowIso = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('user_subscriptions')
    .select('user_id, plan_code, status, expires_at, price_eur')
    .in('user_id', ids)
    .eq('status', 'active')
    .in('plan_code', ['grow', 'elite']);
  if (error) throw error;

  const trusted = new Set();
  for (const row of data || []) {
    if (Number(row.price_eur) <= 0) continue;
    if (row.expires_at && String(row.expires_at) < nowIso) continue;
    const uid = String(row.user_id || '');
    if (uid) trusted.add(uid);
  }
  return trusted;
}

async function posterHasTrustBadge(posterId) {
  const id = String(posterId || '').trim();
  if (!id) return false;
  const set = await loadTrustBadgePosterIdSet([id]);
  return set.has(id);
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
 * @param {string|null} viewerId — optional viewer user id to check private visibility / contact status
 */
async function loadPosterBrief(_posterModelHint, posterId, verifiedContext = null, viewerId = null) {
  try {
    const profile = await getProfileById(posterId);
    if (!profile) return null;
    if (profile.accountType !== 'individual' && profile.accountType !== 'business') return null;

    if (profile.isPrivate) {
      const allowed = await hasContactRelationship(viewerId, profile.id);
      if (!allowed) {
        return null;
      }
    }

    const trustBadge = await posterHasTrustBadge(profile.id);

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
        trustBadge,
        businessOwner: profile.businessOwner?.trim() || null,
        businessCategory: profile.businessCategory?.trim() || null,
        shareThemeColor: profile.shareThemeColor || null,
        isPrivate: Boolean(profile.isPrivate),
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
      trustBadge,
      businessOwner: null,
      businessCategory: null,
      shareThemeColor: profile.shareThemeColor || null,
      isPrivate: Boolean(profile.isPrivate),
    });
  } catch (e) {
    console.warn('loadPosterBrief:', e?.message || e);
    return null;
  }
}

module.exports = {
  loadPosterBrief,
  loadVerifiedPosterIdSet,
  loadTrustBadgePosterIdSet,
  posterHasTrustBadge,
};
