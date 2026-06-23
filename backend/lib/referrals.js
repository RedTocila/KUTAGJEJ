const crypto = require('crypto');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const ReferralProgram = require('../models/ReferralProgram');
const ReferralSignup = require('../models/ReferralSignup');
const DirectoryListing = require('../models/DirectoryListing');
const BusinessListingReview = require('../models/BusinessListingReview');
const ProfessionalListingReview = require('../models/ProfessionalListingReview');
const { ensureReferralProgram } = require('./ensure-referral-program');

const PORTAL_MODELS = [IndividualUser, BusinessUser];

function normalizeReferralCode(raw) {
  if (raw === undefined || raw === null) return '';
  return String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateReferralCodeCandidate() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function isReferralCodeTaken(code, excludeUserId = null) {
  const filter = { referralCode: code };
  for (const Model of PORTAL_MODELS) {
    const q = { ...filter };
    if (excludeUserId) q._id = { $ne: excludeUserId };
    if (await Model.findOne(q).select('_id').lean()) return true;
  }
  return false;
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
  for (const Model of PORTAL_MODELS) {
    const doc = await Model.findOne({ referralCode: normalized, isActive: { $ne: false } });
    if (doc) return doc;
  }
  return null;
}

async function loadPortalUserBrief(userId, userModel) {
  if (!userId) return null;
  const Model = userModel === 'BusinessUser' ? BusinessUser : IndividualUser;
  const u = await Model.findById(userId)
    .select('firstName lastName email businessName businessOwner referralCode boostCredits')
    .lean();
  if (!u) return null;
  const displayName =
    userModel === 'BusinessUser'
      ? (u.businessName && String(u.businessName).trim()) ||
        (u.businessOwner && String(u.businessOwner).trim()) ||
        `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
        u.email
      : `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || u.email;
  return {
    id: String(u._id),
    model: userModel,
    email: u.email,
    displayName,
    referralCode: u.referralCode || null,
    boostCredits: u.boostCredits ?? 0,
  };
}

function getFrontendBaseUrl() {
  const raw =
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    'http://localhost:3000';
  const url = String(raw).trim().replace(/\/$/, '');
  return url.includes('http') ? url : `https://${url}`;
}

function buildReferralLink(code) {
  const base = getFrontendBaseUrl();
  return `${base}/user/auth?ref=${encodeURIComponent(code)}`;
}

async function countFreeReferrals(referrerId, referrerModel) {
  return ReferralSignup.countDocuments({
    referrerId,
    referrerModel,
    kind: 'free-signup',
  });
}

/** Referrals that converted into a paid package (recorded with kind 'paid'). */
async function countPaidReferrals(referrerId, referrerModel) {
  return ReferralSignup.countDocuments({
    referrerId,
    referrerModel,
    kind: 'paid',
  });
}

/** Total reviews received across all of a user's directory listings (businesses + professionals). */
async function countReceivedReviews(userId, userModel) {
  const listings = await DirectoryListing.find({ posterId: userId, posterModel: userModel })
    .select('_id')
    .lean();
  if (listings.length === 0) return 0;
  const listingIds = listings.map((l) => l._id);
  const [businessReviews, professionalReviews] = await Promise.all([
    BusinessListingReview.countDocuments({ listingId: { $in: listingIds } }),
    ProfessionalListingReview.countDocuments({ listingId: { $in: listingIds } }),
  ]);
  return businessReviews + professionalReviews;
}

async function awardReferralTierCredits(referrer) {
  await ensureReferralProgram();
  const program = await ReferralProgram.findById('default').lean();
  if (!program) return 0;

  const count = await countFreeReferrals(referrer._id, referrer.constructor.modelName);
  const claimed = new Set((referrer.referralTiersClaimed || []).map(Number));
  let creditsToAdd = 0;
  const newClaimed = [...(referrer.referralTiersClaimed || [])];

  for (const tier of program.freeTiers || []) {
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
 * @param {import('mongoose').Document} newUser
 * @param {string} referralCodeRaw
 */
async function processReferralOnSignup(newUser, referralCodeRaw) {
  const code = normalizeReferralCode(referralCodeRaw);
  if (!code) return { ok: false, reason: 'empty' };

  const referrer = await findPortalUserByReferralCode(code);
  if (!referrer) return { ok: false, reason: 'invalid_code' };

  if (String(referrer._id) === String(newUser._id)) {
    return { ok: false, reason: 'self_referral' };
  }

  const existing = await ReferralSignup.findOne({
    referredUserId: newUser._id,
    referredUserModel: newUser.constructor.modelName,
  }).lean();
  if (existing) return { ok: false, reason: 'already_referred' };

  newUser.referredById = referrer._id;
  newUser.referredByModel = referrer.constructor.modelName;
  await newUser.save();

  await ReferralSignup.create({
    referrerId: referrer._id,
    referrerModel: referrer.constructor.modelName,
    referredUserId: newUser._id,
    referredUserModel: newUser.constructor.modelName,
    kind: 'free-signup',
    creditsAwarded: 0,
    referralCodeUsed: code,
  });

  const creditsAwarded = await awardReferralTierCredits(referrer);

  if (creditsAwarded > 0) {
    await ReferralSignup.updateOne(
      { referredUserId: newUser._id, referredUserModel: newUser.constructor.modelName },
      { $set: { creditsAwarded } },
    );
  }

  return { ok: true, creditsAwarded };
}

async function ensureUserReferralCode(user) {
  if (user.referralCode && String(user.referralCode).trim()) return user.referralCode;
  user.referralCode = await allocateUniqueReferralCode(user._id);
  await user.save();
  return user.referralCode;
}

async function backfillMissingReferralCodes() {
  for (const Model of PORTAL_MODELS) {
    const users = await Model.find({
      $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }],
    }).select('_id referralCode');
    for (const user of users) {
      await ensureUserReferralCode(user);
    }
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
  buildReferralLink,
  countFreeReferrals,
  countPaidReferrals,
  countReceivedReviews,
  processReferralOnSignup,
  ensureUserReferralCode,
  backfillMissingReferralCodes,
  referralFieldsForUser,
  getFrontendBaseUrl,
};
