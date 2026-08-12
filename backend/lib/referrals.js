const crypto = require('crypto');
const { getSupabaseAdmin } = require('./supabase');
const { getProfileById, mapProfile } = require('./profiles');
const {
  ensureReferralProgram,
  DEFAULT_REFERRAL_PROGRAM_DOC,
} = require('./ensure-referral-program');

const PORTAL_ACCOUNT_TYPES = ['individual', 'business'];

function normalizeReferralCode(raw) {
  if (raw === undefined || raw === null) return '';
  return String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateReferralCodeCandidate() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function isReferralCodeTaken(code, excludeUserId = null) {
  const sb = getSupabaseAdmin();
  let query = sb.from('profiles').select('id').eq('referral_code', code);
  if (excludeUserId) query = query.neq('id', excludeUserId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function allocateUniqueReferralCode(excludeUserId = null) {
  for (let i = 0; i < 24; i += 1) {
    const code = generateReferralCodeCandidate();
    if (!(await isReferralCodeTaken(code, excludeUserId))) return code;
  }
  throw new Error('Could not allocate referral code');
}

async function findPortalUserByReferralCode(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('referral_code', normalized)
    .eq('is_active', true)
    .in('account_type', PORTAL_ACCOUNT_TYPES)
    .maybeSingle();
  if (error) throw error;
  return mapProfile(data);
}

function briefFromMappedProfile(u, userModel) {
  if (!u) return null;
  const model = u.constructor?.modelName || userModel;
  const displayName =
    model === 'BusinessUser'
      ? (u.businessName && String(u.businessName).trim()) ||
        (u.businessOwner && String(u.businessOwner).trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        u.email
      : `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || u.email;

  return {
    id: String(u.id),
    model,
    email: u.email,
    displayName,
    referralCode: u.referralCode || null,
    boostCredits: u.boostCredits ?? 0,
  };
}

async function loadPortalUserBrief(userId, userModel) {
  if (!userId) return null;
  const u = await getProfileById(userId);
  return briefFromMappedProfile(u, userModel);
}

/** Batch-load public briefs. Returns a Map keyed by profile id. */
async function loadPortalUserBriefsByIds(userIds, userModel) {
  const ids = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  const out = new Map();
  if (!ids.length) return out;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('profiles').select('*').in('id', ids);
  if (error) throw error;

  for (const row of data || []) {
    const brief = briefFromMappedProfile(mapProfile(row), userModel);
    if (brief) out.set(String(brief.id), brief);
  }
  return out;
}

const CANONICAL_FRONTEND_URL = 'https://kutagjej.al';

const KNOWN_PUBLIC_HOSTS = new Set([
  'kutagjej.al',
  'www.kutagjej.al',
  'kutagjej.vercel.app',
  'ku-ta-gjej.vercel.app',
  'ku-ta-gjej-front.vercel.app',
]);

function isLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '[::1]' ||
    host.endsWith('.local')
  );
}

function normalizeBaseUrl(raw) {
  if (!raw) return null;
  const url = String(raw).trim().replace(/\/$/, '');
  if (!url) return null;
  return url.includes('http') ? url : `https://${url}`;
}

function isShareablePublicUrl(url) {
  try {
    const parsed = new URL(url);
    if (isLocalHostname(parsed.hostname)) return false;
    if (parsed.hostname.endsWith('.vercel.app') && !KNOWN_PUBLIC_HOSTS.has(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getFrontendBaseUrl() {
  const candidates = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.PUBLIC_SITE_URL,
  ];
  for (const raw of candidates) {
    const url = normalizeBaseUrl(raw);
    if (url && isShareablePublicUrl(url)) return url;
  }
  return CANONICAL_FRONTEND_URL;
}

function buildReferralLink(code) {
  const base = getFrontendBaseUrl();
  return `${base}/user/auth?ref=${encodeURIComponent(code)}`;
}

async function countFreeReferrals(referrerId, _referrerModel) {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from('referral_signups')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('kind', 'free-signup');
  if (error) throw error;
  return count ?? 0;
}

/** Referrals that converted into a paid package (recorded with kind 'paid'). */
async function countPaidReferrals(referrerId, _referrerModel) {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from('referral_signups')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('kind', 'paid');
  if (error) throw error;
  return count ?? 0;
}

/**
 * Aggregate reviews received on a member's public profile and across their
 * directory listings (businesses + professionals). Same pool as the Trusted referral badge.
 * @returns {Promise<{ reviewCount: number, ratingAverage: number | null }>}
 */
async function getReceivedReviewStats(userId, _userModel) {
  const sb = getSupabaseAdmin();
  const [{ data: listings, error: listErr }, memberRes] = await Promise.all([
    sb.from('directory_listings').select('id').eq('poster_id', userId),
    sb.from('member_reviews').select('rating').eq('member_id', userId),
  ]);
  if (listErr) throw listErr;

  // Table may be missing until migration is applied — treat as zero member reviews.
  const memberMissing =
    memberRes.error &&
    (memberRes.error.code === '42P01' ||
      /member_reviews|does not exist|schema cache/i.test(String(memberRes.error.message || '')));
  if (memberRes.error && !memberMissing) throw memberRes.error;

  const listingIds = (listings || []).map((l) => l.id);
  let listingRatings = [];
  if (listingIds.length > 0) {
    const [businessRes, professionalRes] = await Promise.all([
      sb.from('business_listing_reviews').select('rating').in('listing_id', listingIds),
      sb.from('professional_listing_reviews').select('rating').in('listing_id', listingIds),
    ]);
    if (businessRes.error) throw businessRes.error;
    if (professionalRes.error) throw professionalRes.error;
    listingRatings = [...(businessRes.data || []), ...(professionalRes.data || [])];
  }

  const ratings = [...(memberMissing ? [] : memberRes.data || []), ...listingRatings].map(
    (row) => Number(row.rating) || 0,
  );
  const reviewCount = ratings.length;
  if (reviewCount === 0) return { reviewCount: 0, ratingAverage: null };

  const total = ratings.reduce((sum, value) => sum + value, 0);
  return {
    reviewCount,
    ratingAverage: Math.round((total / reviewCount) * 10) / 10,
  };
}

/** Total reviews received across all of a user's directory listings (businesses + professionals). */
async function countReceivedReviews(userId, userModel) {
  const stats = await getReceivedReviewStats(userId, userModel);
  return stats.reviewCount;
}

function programField(program, camel, snake, fallback) {
  if (program[camel] !== undefined) return program[camel];
  if (program[snake] !== undefined) return program[snake];
  return fallback;
}

/**
 * Public profile badges from the referral program (earned + locked slots).
 * @returns {Promise<Array<{ id: string, kind: string, label: string, earned: boolean, description?: string, lifetimePercent?: number, level?: number }>>}
 */
async function resolveReferralBadges(userId, userModel) {
  await ensureReferralProgram();
  const sb = getSupabaseAdmin();
  const { data: program, error } = await sb.from('referral_programs').select('*').eq('id', 'default').maybeSingle();
  if (error) throw error;
  if (!program) return [];

  const [referralCount, paidReferralCount, reviewCount] = await Promise.all([
    countFreeReferrals(userId, userModel),
    countPaidReferrals(userId, userModel),
    countReceivedReviews(userId, userModel),
  ]);

  const badges = [];
  const freeTiers = [...programField(program, 'freeTiers', 'free_tiers', [])].sort(
    (a, b) => Number(a.referralsRequired) - Number(b.referralsRequired),
  );
  for (const tier of freeTiers) {
    badges.push({
      id: `free-tier-${tier.level}`,
      kind: 'free-tier',
      label: String(tier.title || `Niveli ${tier.level}`).trim(),
      description: `${tier.referralsRequired} referime`,
      level: Number(tier.level) || 0,
      earned: referralCount >= Number(tier.referralsRequired),
      metric: 'free-referrals',
      threshold: Number(tier.referralsRequired) || 0,
      progress: referralCount,
    });
  }

  const paidTiers = [...programField(program, 'paidTiers', 'paid_tiers', [])].sort(
    (a, b) => Number(a.paidReferralsRequired) - Number(b.paidReferralsRequired),
  );
  for (const tier of paidTiers) {
    badges.push({
      id: `paid-tier-${tier.tier}`,
      kind: 'paid-tier',
      label: String(tier.title || `Paketa ${tier.tier}`).trim(),
      description: `${tier.paidReferralsRequired} referime të paguara`,
      level: Number(tier.tier) || 0,
      earned: paidReferralCount >= Number(tier.paidReferralsRequired),
      metric: 'paid-referrals',
      threshold: Number(tier.paidReferralsRequired) || 0,
      progress: paidReferralCount,
    });
  }

  const freeComplete =
    freeTiers.length > 0 &&
    referralCount >= Number(freeTiers[freeTiers.length - 1].referralsRequired);
  const paidComplete =
    paidTiers.length > 0 &&
    paidReferralCount >= Number(paidTiers[paidTiers.length - 1].paidReferralsRequired);

  const networkBuilderBadge = programField(program, 'networkBuilderBadge', 'network_builder_badge', null);
  if (networkBuilderBadge) {
    const freeThreshold = freeTiers.length
      ? Number(freeTiers[freeTiers.length - 1].referralsRequired)
      : 0;
    badges.push({
      id: 'network-builder',
      kind: 'network-builder',
      label: networkBuilderBadge.label,
      description: networkBuilderBadge.description || '',
      lifetimePercent: networkBuilderBadge.lifetimePercent,
      earned: freeComplete,
      metric: 'free-referrals',
      threshold: freeThreshold,
      progress: referralCount,
    });
  }

  const revenueDriverBadge = programField(program, 'revenueDriverBadge', 'revenue_driver_badge', null);
  if (revenueDriverBadge) {
    const paidThreshold = paidTiers.length
      ? Number(paidTiers[paidTiers.length - 1].paidReferralsRequired)
      : 0;
    badges.push({
      id: 'revenue-driver',
      kind: 'revenue-driver',
      label: revenueDriverBadge.label,
      description: revenueDriverBadge.description || '',
      lifetimePercent: revenueDriverBadge.lifetimePercent,
      earned: paidComplete,
      metric: 'paid-referrals',
      threshold: paidThreshold,
      progress: paidReferralCount,
    });
  }

  const rawReviewMilestones = programField(program, 'reviewMilestones', 'review_milestones', []);
  const reviewMilestones = [
    ...(Array.isArray(rawReviewMilestones) && rawReviewMilestones.length > 0
      ? rawReviewMilestones
      : DEFAULT_REFERRAL_PROGRAM_DOC.reviewMilestones || []),
  ].sort((a, b) => Number(a.reviewsRequired) - Number(b.reviewsRequired));
  for (const milestone of reviewMilestones) {
    const required = Number(milestone.reviewsRequired) || 0;
    if (required <= 0) continue;
    badges.push({
      id: `review-tier-${required}`,
      kind: 'review-tier',
      label: `${required} Vlerësime`,
      description: `${required} vlerësime`,
      level: required,
      earned: reviewCount >= required,
      metric: 'reviews',
      threshold: required,
      progress: reviewCount,
    });
  }

  const trustedReviewerBadge = programField(program, 'trustedReviewerBadge', 'trusted_reviewer_badge', null);
  const trustedRequired = Number(trustedReviewerBadge?.reviewsRequired) || 0;
  const trustedEarned = trustedRequired > 0 && reviewCount >= trustedRequired;
  if (trustedReviewerBadge) {
    badges.push({
      id: 'trusted-reviewer',
      kind: 'trusted-reviewer',
      label: trustedReviewerBadge.label,
      description: trustedReviewerBadge.description || '',
      lifetimePercent: trustedReviewerBadge.lifetimePercent,
      earned: trustedEarned,
      metric: 'reviews',
      threshold: trustedRequired,
      progress: reviewCount,
    });
  }

  const platformDominatorBadge = programField(program, 'platformDominatorBadge', 'platform_dominator_badge', null);
  if (platformDominatorBadge) {
    badges.push({
      id: 'platform-dominator',
      kind: 'platform-dominator',
      label: platformDominatorBadge.label,
      description: platformDominatorBadge.description || '',
      lifetimePercent: platformDominatorBadge.lifetimePercent,
      earned: freeComplete && paidComplete && trustedEarned,
      metric: 'combo',
      threshold: 3,
      progress: (freeComplete ? 1 : 0) + (paidComplete ? 1 : 0) + (trustedEarned ? 1 : 0),
    });
  }

  return badges;
}

async function awardReferralTierCredits(referrer) {
  await ensureReferralProgram();
  const sb = getSupabaseAdmin();
  const { data: program, error } = await sb.from('referral_programs').select('*').eq('id', 'default').maybeSingle();
  if (error) throw error;
  if (!program) return 0;

  const count = await countFreeReferrals(referrer.id);
  const claimed = new Set((referrer.referralTiersClaimed || []).map(Number));
  let creditsToAdd = 0;
  const newClaimed = [...(referrer.referralTiersClaimed || [])];

  for (const tier of programField(program, 'freeTiers', 'free_tiers', [])) {
    const level = Number(tier.level);
    if (!Number.isFinite(level)) continue;
    if (count >= tier.referralsRequired && !claimed.has(level)) {
      creditsToAdd += Math.max(0, Number(tier.boostCredits) || 0);
      newClaimed.push(level);
      claimed.add(level);
    }
  }

  if (creditsToAdd > 0) {
    referrer.boostCredits = (referrer.boostCredits || 0) + creditsToAdd;
    referrer.referralTiersClaimed = newClaimed;
    await referrer.save();
  }

  return creditsToAdd;
}

/**
 * After a new portal user registers with a valid referral code.
 * @param {ReturnType<typeof mapProfile>} newUser
 * @param {string} referralCodeRaw
 */
async function processReferralOnSignup(newUser, referralCodeRaw) {
  const code = normalizeReferralCode(referralCodeRaw);
  if (!code) return { ok: false, reason: 'empty' };

  const referrer = await findPortalUserByReferralCode(code);
  if (!referrer) return { ok: false, reason: 'invalid_code' };

  if (String(referrer.id) === String(newUser.id)) {
    return { ok: false, reason: 'self_referral' };
  }

  const sb = getSupabaseAdmin();
  const { data: existing, error: findErr } = await sb
    .from('referral_signups')
    .select('id')
    .eq('referred_user_id', newUser.id)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return { ok: false, reason: 'already_referred' };

  newUser.referredById = referrer.id;
  newUser.referredByModel = referrer.constructor.modelName;
  await newUser.save();

  const { error: insertErr } = await sb.from('referral_signups').insert({
    referrer_id: referrer.id,
    referred_user_id: newUser.id,
    kind: 'free-signup',
    credits_awarded: 0,
    referral_code_used: code,
  });
  if (insertErr) throw insertErr;

  const creditsAwarded = await awardReferralTierCredits(referrer);

  if (creditsAwarded > 0) {
    const { error: updateErr } = await sb
      .from('referral_signups')
      .update({ credits_awarded: creditsAwarded, updated_at: new Date().toISOString() })
      .eq('referred_user_id', newUser.id);
    if (updateErr) throw updateErr;
  }

  return { ok: true, creditsAwarded };
}

async function ensureUserReferralCode(user) {
  if (user.referralCode && String(user.referralCode).trim()) return user.referralCode;
  const code = await allocateUniqueReferralCode(user.id);
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ referral_code: code, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw error;
  user.referralCode = code;
  return user.referralCode;
}

async function backfillMissingReferralCodes() {
  const sb = getSupabaseAdmin();
  const { data: users, error } = await sb
    .from('profiles')
    .select('*')
    .in('account_type', PORTAL_ACCOUNT_TYPES)
    .or('referral_code.is.null,referral_code.eq.');
  if (error) throw error;

  for (const row of users || []) {
    const user = mapProfile(row);
    await ensureUserReferralCode(user);
  }
}

function referralFieldsForUser(user) {
  if (!user) return {};
  const model = user.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') return {};
  return {
    referralCode: user.referralCode || null,
    boostCredits: user.boostCredits ?? 0,
    referredById: user.referredById ? String(user.referredById) : null,
    referredByModel: user.referredByModel || null,
  };
}

module.exports = {
  normalizeReferralCode,
  allocateUniqueReferralCode,
  findPortalUserByReferralCode,
  loadPortalUserBrief,
  loadPortalUserBriefsByIds,
  buildReferralLink,
  countFreeReferrals,
  countPaidReferrals,
  countReceivedReviews,
  getReceivedReviewStats,
  resolveReferralBadges,
  processReferralOnSignup,
  ensureUserReferralCode,
  backfillMissingReferralCodes,
  referralFieldsForUser,
  getFrontendBaseUrl,
};
