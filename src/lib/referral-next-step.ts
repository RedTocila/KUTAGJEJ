import type { ReferralProgram } from '@/types/referral-program';
import type { MyReferralStats } from '@/types/referrals';

export type ReferralNextStepKind =
  | 'free-tier'
  | 'paid-tier'
  | 'review-tier'
  | 'trusted-reviewer'
  | 'login-streak';

export interface ReferralNextStep {
  kind: ReferralNextStepKind;
  title: string;
  hint: string;
  reward: string;
  current: number;
  required: number;
  remaining: number;
  progressPercent: number;
}

function progressOf(current: number, required: number) {
  const need = Math.max(1, required);
  const have = Math.max(0, current);
  return Math.min(100, Math.round((have / need) * 100));
}

function remainingOf(current: number, required: number) {
  return Math.max(0, required - Math.max(0, current));
}

/** First unfinished reward across free → paid → reviews → Trusted → Dominator → daily streak. */
export function resolveNextReferralStep(
  program: ReferralProgram | undefined,
  stats: MyReferralStats,
): ReferralNextStep | null {
  const referralCount = Math.max(0, Number(stats.referralCount) || 0);
  const paidCount = Math.max(0, Number(stats.paidReferralCount) || 0);
  const reviewCount = Math.max(0, Number(stats.reviewCount) || 0);

  if (!program) {
    const fallback = stats.nextTier;
    if (!fallback) return null;
    const remaining = Math.max(0, Number(fallback.remaining) || remainingOf(referralCount, fallback.referralsRequired));
    return {
      kind: 'free-tier',
      title: fallback.title,
      hint:
        remaining === 1
          ? `Edhe 1 referim falas (${referralCount}/${fallback.referralsRequired})`
          : `Edhe ${remaining} referime falas (${referralCount}/${fallback.referralsRequired})`,
      reward: `+${fallback.boostCredits} BC`,
      current: referralCount,
      required: fallback.referralsRequired,
      remaining,
      progressPercent: progressOf(referralCount, fallback.referralsRequired),
    };
  }

  const freeTiers = [...(program?.freeTiers || [])].sort(
    (a, b) => a.referralsRequired - b.referralsRequired,
  );
  const nextFree = freeTiers.find((tier) => referralCount < tier.referralsRequired);
  if (nextFree) {
    const remaining = remainingOf(referralCount, nextFree.referralsRequired);
    return {
      kind: 'free-tier',
      title: nextFree.title,
      hint:
        remaining === 1
          ? `Edhe 1 referim falas (${referralCount}/${nextFree.referralsRequired})`
          : `Edhe ${remaining} referime falas (${referralCount}/${nextFree.referralsRequired})`,
      reward: `+${nextFree.boostCredits} BC`,
      current: referralCount,
      required: nextFree.referralsRequired,
      remaining,
      progressPercent: progressOf(referralCount, nextFree.referralsRequired),
    };
  }

  const paidTiers = [...(program?.paidTiers || [])].sort(
    (a, b) => a.paidReferralsRequired - b.paidReferralsRequired,
  );
  const nextPaid = paidTiers.find((tier) => paidCount < tier.paidReferralsRequired);
  if (nextPaid) {
    const remaining = remainingOf(paidCount, nextPaid.paidReferralsRequired);
    const extra =
      nextPaid.premiumMonths > 0 ? ` · +${nextPaid.premiumMonths} muaj premium` : '';
    return {
      kind: 'paid-tier',
      title: nextPaid.title,
      hint:
        remaining === 1
          ? `Edhe 1 referim i paguar — kur i ftuari blen një paketë (${paidCount}/${nextPaid.paidReferralsRequired})`
          : `Edhe ${remaining} referime të paguara — kur të ftuarit blejnë një paketë (${paidCount}/${nextPaid.paidReferralsRequired})`,
      reward: `+${nextPaid.boostCredits} BC${extra}`,
      current: paidCount,
      required: nextPaid.paidReferralsRequired,
      remaining,
      progressPercent: progressOf(paidCount, nextPaid.paidReferralsRequired),
    };
  }

  const reviewMilestones = [...(program?.reviewMilestones || [])].sort(
    (a, b) => a.reviewsRequired - b.reviewsRequired,
  );
  const nextReview = reviewMilestones.find((row) => reviewCount < row.reviewsRequired);
  if (nextReview) {
    const remaining = remainingOf(reviewCount, nextReview.reviewsRequired);
    return {
      kind: 'review-tier',
      title: `${nextReview.reviewsRequired} vlerësime`,
      hint:
        remaining === 1
          ? `Edhe 1 vlerësim në profil ose shpallje (${reviewCount}/${nextReview.reviewsRequired})`
          : `Edhe ${remaining} vlerësime në profil ose shpallje (${reviewCount}/${nextReview.reviewsRequired})`,
      reward: `+${nextReview.boostCredits} BC`,
      current: reviewCount,
      required: nextReview.reviewsRequired,
      remaining,
      progressPercent: progressOf(reviewCount, nextReview.reviewsRequired),
    };
  }

  const trustedNeed = Number(program?.trustedReviewerBadge?.reviewsRequired) || 0;
  if (trustedNeed > 0 && reviewCount < trustedNeed) {
    const remaining = remainingOf(reviewCount, trustedNeed);
    const pct = Number(program?.trustedReviewerBadge?.lifetimePercent) || 0;
    return {
      kind: 'trusted-reviewer',
      title: program?.trustedReviewerBadge?.label || 'Trusted',
      hint:
        remaining === 1
          ? `Edhe 1 vlerësim për badge-in Trusted (${reviewCount}/${trustedNeed})`
          : `Edhe ${remaining} vlerësime për badge-in Trusted (${reviewCount}/${trustedNeed})`,
      reward: pct > 0 ? `−${pct}% paketa` : 'Badge Trusted',
      current: reviewCount,
      required: trustedNeed,
      remaining,
      progressPercent: progressOf(reviewCount, trustedNeed),
    };
  }

  const streakRequired = Math.max(1, Number(program?.loginStreak?.daysRequired) || 7);
  const streakCurrent = Math.max(0, Number(stats.loginStreakDays) || 0);
  if (streakCurrent < streakRequired) {
    const remaining = remainingOf(streakCurrent, streakRequired);
    const rewardBc = Number(program?.loginStreak?.boostCredits) || 0;
    return {
      kind: 'login-streak',
      title: program?.loginStreakTitle || 'Aktivitet ditor',
      hint: `Hyr ${streakRequired} ditë radhazi (${streakCurrent}/${streakRequired})`,
      reward: rewardBc > 0 ? `+${rewardBc} BC` : '',
      current: streakCurrent,
      required: streakRequired,
      remaining,
      progressPercent: progressOf(streakCurrent, streakRequired),
    };
  }

  return null;
}
