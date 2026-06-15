import type {
  ReferralFreeTier,
  ReferralPaidTier,
  ReferralReviewMilestone,
  ReferralTrustedBadge,
} from '@/types/referral-program';

export function emptyFreeTier(): ReferralFreeTier {
  return { level: 1, title: '', referralsRequired: 0, boostCredits: 0 };
}

export function emptyPaidTier(): ReferralPaidTier {
  return { tier: 1, title: '', paidReferralsRequired: 0, boostCredits: 0, premiumMonths: 0, extraNote: '' };
}

export function emptyReviewMilestone(): ReferralReviewMilestone {
  return { reviewsRequired: 0, boostCredits: 0 };
}

export function emptyTrustedBadge(): ReferralTrustedBadge {
  return { label: '', lifetimePercent: 0, reviewsRequired: 0, description: '' };
}
