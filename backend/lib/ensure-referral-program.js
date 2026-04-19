const ReferralProgram = require('../models/ReferralProgram');

const DEFAULT_DOC = {
  _id: 'default',
  pageTitle: 'REFERRAL SYSTEM 🤝',
  pageSubtitle: 'Rrit rrjetin tënd dhe fito Boost Credits, badge dhe përfitime jetëgjatësi.',
  freeSignUpTitle: 'FREE SIGN-UP PROMOTIONS',
  freeSignUpSubtitle: 'Për çdo përdorues të ri që regjistrohet falas përmes linkut tënd.',
  freeTiers: [
    { level: 1, title: 'Starter', referralsRequired: 1, boostCredits: 5 },
    { level: 2, title: 'Active', referralsRequired: 5, boostCredits: 25 },
    { level: 3, title: 'Promoter', referralsRequired: 20, boostCredits: 75 },
    { level: 4, title: 'Influencer', referralsRequired: 50, boostCredits: 150 },
    { level: 5, title: 'Promoter', referralsRequired: 100, boostCredits: 300 },
  ],
  networkBuilderBadge: {
    label: 'Network Builder Badge',
    lifetimePercent: 10,
    description: '10% Lifetime nga rrjeti i ndërtuar (free sign-ups).',
  },
  paidTitle: 'PAID PROMOTION PACKAGES',
  paidSubtitle: 'Kur referimet tënd i konvertohen në paketa të paguara.',
  paidTiers: [
    {
      tier: 1,
      title: 'Starter Promoter',
      paidReferralsRequired: 1,
      boostCredits: 30,
      premiumMonths: 0,
      extraNote: '',
    },
    {
      tier: 2,
      title: 'Growth Builder',
      paidReferralsRequired: 5,
      boostCredits: 150,
      premiumMonths: 0,
      extraNote: '',
    },
    {
      tier: 3,
      title: 'Network Power',
      paidReferralsRequired: 15,
      boostCredits: 100,
      premiumMonths: 1,
      extraNote: '1 muaj paketë premium',
    },
  ],
  revenueDriverBadge: {
    label: 'Revenue Driver Badge',
    lifetimePercent: 5,
    description: '5% Lifetime nga referimet e paguara.',
  },
  reviewsTitle: 'REVIEWS ⭐️',
  reviewsSubtitle: 'Vlerësime nga përdoruesit për listimet ose shërbimin tënd.',
  reviewMilestones: [
    { reviewsRequired: 10, boostCredits: 5 },
    { reviewsRequired: 35, boostCredits: 20 },
    { reviewsRequired: 100, boostCredits: 75 },
  ],
  trustedReviewerBadge: {
    label: 'Trusted',
    lifetimePercent: 3,
    reviewsRequired: 100,
    description: '3% Lifetime kur arrin pragun e vlerësimeve.',
  },
  completionTitle: 'Completed All Referral',
  completionSubtitle: 'Kur përmbush të gjitha nivelet e sistemit të referimit.',
  platformDominatorBadge: {
    label: 'Platform Dominator',
    lifetimePercent: 18,
    description: '18% Lifetime për përfundimin e plotë të programit të referimit.',
  },
  loginStreakTitle: 'Log In streak',
  loginStreakSubtitle: 'Angazhim i qëndrueshëm në platformë.',
  loginStreak: { daysRequired: 7, boostCredits: 5 },
};

function format(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(o._id),
    pageTitle: o.pageTitle,
    pageSubtitle: o.pageSubtitle || '',
    freeSignUpTitle: o.freeSignUpTitle,
    freeSignUpSubtitle: o.freeSignUpSubtitle || '',
    freeTiers: (o.freeTiers || []).map((t) => ({
      level: t.level,
      title: t.title,
      referralsRequired: t.referralsRequired,
      boostCredits: t.boostCredits,
    })),
    networkBuilderBadge: {
      label: o.networkBuilderBadge.label,
      lifetimePercent: o.networkBuilderBadge.lifetimePercent,
      description: o.networkBuilderBadge.description || '',
    },
    paidTitle: o.paidTitle,
    paidSubtitle: o.paidSubtitle || '',
    paidTiers: (o.paidTiers || []).map((t) => ({
      tier: t.tier,
      title: t.title,
      paidReferralsRequired: t.paidReferralsRequired,
      boostCredits: t.boostCredits,
      premiumMonths: t.premiumMonths ?? 0,
      extraNote: t.extraNote || '',
    })),
    revenueDriverBadge: {
      label: o.revenueDriverBadge.label,
      lifetimePercent: o.revenueDriverBadge.lifetimePercent,
      description: o.revenueDriverBadge.description || '',
    },
    reviewsTitle: o.reviewsTitle,
    reviewsSubtitle: o.reviewsSubtitle || '',
    reviewMilestones: (o.reviewMilestones || []).map((m) => ({
      reviewsRequired: m.reviewsRequired,
      boostCredits: m.boostCredits,
    })),
    trustedReviewerBadge: {
      label: o.trustedReviewerBadge.label,
      lifetimePercent: o.trustedReviewerBadge.lifetimePercent,
      reviewsRequired: o.trustedReviewerBadge.reviewsRequired,
      description: o.trustedReviewerBadge.description || '',
    },
    completionTitle: o.completionTitle,
    completionSubtitle: o.completionSubtitle || '',
    platformDominatorBadge: {
      label: o.platformDominatorBadge.label,
      lifetimePercent: o.platformDominatorBadge.lifetimePercent,
      description: o.platformDominatorBadge.description || '',
    },
    loginStreakTitle: o.loginStreakTitle,
    loginStreakSubtitle: o.loginStreakSubtitle || '',
    loginStreak: {
      daysRequired: o.loginStreak.daysRequired,
      boostCredits: o.loginStreak.boostCredits,
    },
    updatedAt: o.updatedAt,
  };
}

async function ensureReferralProgram() {
  const existing = await ReferralProgram.findById('default').lean();
  if (existing) return;
  await ReferralProgram.create(DEFAULT_DOC);
}

module.exports = {
  ensureReferralProgram,
  formatReferralProgram: format,
  DEFAULT_REFERRAL_PROGRAM_DOC: DEFAULT_DOC,
};
