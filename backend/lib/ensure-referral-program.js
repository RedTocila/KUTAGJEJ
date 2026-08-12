const { getSupabaseAdmin } = require('./supabase');

const DEFAULT_DOC = {
  id: 'default',
  page_title: 'REFERRAL SYSTEM 🤝',
  page_subtitle: 'Rrit rrjetin tënd dhe fito Boost Credits, badge dhe përfitime jetëgjatësi.',
  free_sign_up_title: 'FREE SIGN-UP PROMOTIONS',
  free_sign_up_subtitle: 'Për çdo përdorues të ri që regjistrohet falas përmes linkut tënd.',
  free_tiers: [
    { level: 1, title: 'Starter', referralsRequired: 1, boostCredits: 5 },
    { level: 2, title: 'Active', referralsRequired: 5, boostCredits: 25 },
    { level: 3, title: 'Promoter', referralsRequired: 20, boostCredits: 75 },
    { level: 4, title: 'Influencer', referralsRequired: 50, boostCredits: 150 },
    { level: 5, title: 'Promoter', referralsRequired: 100, boostCredits: 300 },
  ],
  network_builder_badge: {
    label: 'Network Builder Badge',
    lifetimePercent: 10,
    description: '10% Lifetime nga rrjeti i ndërtuar (free sign-ups).',
  },
  paid_title: 'PAID PROMOTION PACKAGES',
  paid_subtitle: 'Kur referimet tënd i konvertohen në paketa të paguara.',
  paid_tiers: [
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
  revenue_driver_badge: {
    label: 'Revenue Driver Badge',
    lifetimePercent: 5,
    description: '5% Lifetime nga referimet e paguara.',
  },
  reviews_title: 'REVIEWS ⭐️',
  reviews_subtitle: 'Vlerësime nga përdoruesit për listimet ose shërbimin tënd.',
  review_milestones: [
    { reviewsRequired: 10, boostCredits: 5 },
    { reviewsRequired: 35, boostCredits: 20 },
    { reviewsRequired: 100, boostCredits: 75 },
  ],
  trusted_reviewer_badge: {
    label: 'Trusted',
    lifetimePercent: 5,
    reviewsRequired: 100,
    description: '5% Lifetime kur arrin pragun e vlerësimeve.',
  },
  completion_title: 'Completed All Referral',
  completion_subtitle: 'Kur përmbush të gjitha nivelet e sistemit të referimit.',
  platform_dominator_badge: {
    label: 'Platform Dominator',
    lifetimePercent: 20,
    description: '20% Lifetime për përfundimin e plotë të programit të referimit.',
  },
  login_streak_title: 'Log In streak',
  login_streak_subtitle: 'Angazhim i qëndrueshëm në platformë.',
  login_streak: { daysRequired: 7, boostCredits: 10 },
};

/** @deprecated camelCase alias kept for callers that import the seed doc. */
const DEFAULT_REFERRAL_PROGRAM_DOC = {
  _id: 'default',
  pageTitle: DEFAULT_DOC.page_title,
  pageSubtitle: DEFAULT_DOC.page_subtitle,
  freeSignUpTitle: DEFAULT_DOC.free_sign_up_title,
  freeSignUpSubtitle: DEFAULT_DOC.free_sign_up_subtitle,
  freeTiers: DEFAULT_DOC.free_tiers,
  networkBuilderBadge: DEFAULT_DOC.network_builder_badge,
  paidTitle: DEFAULT_DOC.paid_title,
  paidSubtitle: DEFAULT_DOC.paid_subtitle,
  paidTiers: DEFAULT_DOC.paid_tiers,
  revenueDriverBadge: DEFAULT_DOC.revenue_driver_badge,
  reviewsTitle: DEFAULT_DOC.reviews_title,
  reviewsSubtitle: DEFAULT_DOC.reviews_subtitle,
  reviewMilestones: DEFAULT_DOC.review_milestones,
  trustedReviewerBadge: DEFAULT_DOC.trusted_reviewer_badge,
  completionTitle: DEFAULT_DOC.completion_title,
  completionSubtitle: DEFAULT_DOC.completion_subtitle,
  platformDominatorBadge: DEFAULT_DOC.platform_dominator_badge,
  loginStreakTitle: DEFAULT_DOC.login_streak_title,
  loginStreakSubtitle: DEFAULT_DOC.login_streak_subtitle,
  loginStreak: DEFAULT_DOC.login_streak,
};

function pick(doc, camel, snake, fallback) {
  if (doc[camel] !== undefined) return doc[camel];
  if (doc[snake] !== undefined) return doc[snake];
  return fallback;
}

function format(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const freeTiers = pick(o, 'freeTiers', 'free_tiers', []);
  const paidTiers = pick(o, 'paidTiers', 'paid_tiers', []);
  const reviewMilestones = pick(o, 'reviewMilestones', 'review_milestones', []);
  const networkBuilderBadge = pick(o, 'networkBuilderBadge', 'network_builder_badge', {});
  const revenueDriverBadge = pick(o, 'revenueDriverBadge', 'revenue_driver_badge', {});
  const trustedReviewerBadge = pick(o, 'trustedReviewerBadge', 'trusted_reviewer_badge', {});
  const platformDominatorBadge = pick(o, 'platformDominatorBadge', 'platform_dominator_badge', {});
  const loginStreak = pick(o, 'loginStreak', 'login_streak', {});

  return {
    id: String(pick(o, 'id', 'id', pick(o, '_id', '_id', 'default'))),
    pageTitle: pick(o, 'pageTitle', 'page_title', ''),
    pageSubtitle: pick(o, 'pageSubtitle', 'page_subtitle', ''),
    freeSignUpTitle: pick(o, 'freeSignUpTitle', 'free_sign_up_title', ''),
    freeSignUpSubtitle: pick(o, 'freeSignUpSubtitle', 'free_sign_up_subtitle', ''),
    freeTiers: (freeTiers || []).map((t) => ({
      level: t.level,
      title: t.title,
      referralsRequired: t.referralsRequired,
      boostCredits: t.boostCredits,
    })),
    networkBuilderBadge: {
      label: networkBuilderBadge.label,
      lifetimePercent: networkBuilderBadge.lifetimePercent,
      description: networkBuilderBadge.description || '',
    },
    paidTitle: pick(o, 'paidTitle', 'paid_title', ''),
    paidSubtitle: pick(o, 'paidSubtitle', 'paid_subtitle', ''),
    paidTiers: (paidTiers || []).map((t) => ({
      tier: t.tier,
      title: t.title,
      paidReferralsRequired: t.paidReferralsRequired,
      boostCredits: t.boostCredits,
      premiumMonths: t.premiumMonths ?? 0,
      extraNote: t.extraNote || '',
    })),
    revenueDriverBadge: {
      label: revenueDriverBadge.label,
      lifetimePercent: revenueDriverBadge.lifetimePercent,
      description: revenueDriverBadge.description || '',
    },
    reviewsTitle: pick(o, 'reviewsTitle', 'reviews_title', ''),
    reviewsSubtitle: pick(o, 'reviewsSubtitle', 'reviews_subtitle', ''),
    reviewMilestones: (reviewMilestones || []).map((m) => ({
      reviewsRequired: m.reviewsRequired,
      boostCredits: m.boostCredits,
    })),
    trustedReviewerBadge: {
      label: trustedReviewerBadge.label,
      lifetimePercent: trustedReviewerBadge.lifetimePercent,
      reviewsRequired: trustedReviewerBadge.reviewsRequired,
      description: trustedReviewerBadge.description || '',
    },
    completionTitle: pick(o, 'completionTitle', 'completion_title', ''),
    completionSubtitle: pick(o, 'completionSubtitle', 'completion_subtitle', ''),
    platformDominatorBadge: {
      label: platformDominatorBadge.label,
      lifetimePercent: platformDominatorBadge.lifetimePercent,
      description: platformDominatorBadge.description || '',
    },
    loginStreakTitle: pick(o, 'loginStreakTitle', 'login_streak_title', ''),
    loginStreakSubtitle: pick(o, 'loginStreakSubtitle', 'login_streak_subtitle', ''),
    loginStreak: {
      daysRequired: loginStreak.daysRequired,
      boostCredits: loginStreak.boostCredits,
    },
    updatedAt: pick(o, 'updatedAt', 'updated_at', null),
  };
}

async function ensureReferralProgram() {
  const sb = getSupabaseAdmin();
  const { data: existing, error: findErr } = await sb
    .from('referral_programs')
    .select('id, trusted_reviewer_badge, platform_dominator_badge, login_streak')
    .eq('id', 'default')
    .maybeSingle();
  if (findErr) throw findErr;

  if (!existing) {
    const { error } = await sb.from('referral_programs').insert({
      ...DEFAULT_DOC,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }

  // Migrate old defaults: Trusted 3% → 5%, Platform Dominator 18% → 20% (10+5+5).
  const trusted = existing.trusted_reviewer_badge || {};
  const dominator = existing.platform_dominator_badge || {};
  const patch = {};
  if (Number(trusted.lifetimePercent) === 3) {
    patch.trusted_reviewer_badge = {
      ...trusted,
      lifetimePercent: 5,
      description:
        trusted.description === '3% Lifetime kur arrin pragun e vlerësimeve.'
          ? DEFAULT_DOC.trusted_reviewer_badge.description
          : trusted.description,
    };
  }
  if (Number(dominator.lifetimePercent) === 18) {
    patch.platform_dominator_badge = {
      ...dominator,
      lifetimePercent: 20,
      description:
        dominator.description === '18% Lifetime për përfundimin e plotë të programit të referimit.'
          ? DEFAULT_DOC.platform_dominator_badge.description
          : dominator.description,
    };
  }
  const streak = existing.login_streak || {};
  if (Number(streak.boostCredits) === 5) {
    patch.login_streak = { ...streak, boostCredits: 10 };
  }
  if (Object.keys(patch).length === 0) return;

  const { error: updateErr } = await sb
    .from('referral_programs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default');
  if (updateErr) throw updateErr;
}

module.exports = {
  ensureReferralProgram,
  formatReferralProgram: format,
  DEFAULT_REFERRAL_PROGRAM_DOC,
};
