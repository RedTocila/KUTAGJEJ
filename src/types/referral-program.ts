export interface ReferralBadge {
  label: string;
  lifetimePercent: number;
  description: string;
}

export interface ReferralTrustedBadge extends ReferralBadge {
  reviewsRequired: number;
}

export interface ReferralFreeTier {
  level: number;
  title: string;
  referralsRequired: number;
  boostCredits: number;
}

export interface ReferralPaidTier {
  tier: number;
  title: string;
  paidReferralsRequired: number;
  boostCredits: number;
  premiumMonths: number;
  extraNote: string;
}

export interface ReferralReviewMilestone {
  reviewsRequired: number;
  boostCredits: number;
}

export interface ReferralProgram {
  id: string;
  pageTitle: string;
  pageSubtitle: string;
  freeSignUpTitle: string;
  freeSignUpSubtitle: string;
  freeTiers: ReferralFreeTier[];
  networkBuilderBadge: ReferralBadge;
  paidTitle: string;
  paidSubtitle: string;
  paidTiers: ReferralPaidTier[];
  revenueDriverBadge: ReferralBadge;
  reviewsTitle: string;
  reviewsSubtitle: string;
  reviewMilestones: ReferralReviewMilestone[];
  trustedReviewerBadge: ReferralTrustedBadge;
  completionTitle: string;
  completionSubtitle: string;
  platformDominatorBadge: ReferralBadge;
  loginStreakTitle: string;
  loginStreakSubtitle: string;
  loginStreak: { daysRequired: number; boostCredits: number };
  updatedAt?: string;
}
