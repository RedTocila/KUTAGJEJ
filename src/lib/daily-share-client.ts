'use client';

import { clientFetch } from '@/lib/api-client';
import { DAILY_SHARE_BOOST_CREDITS } from '@/lib/listing-share';

export type DailyShareClaimResult = {
  awarded: boolean;
  alreadyClaimed: boolean;
  boostCredits: number;
  creditsAwarded: number;
  dailyShareClaimedOn: string;
  dailyShareBoostCredits: number;
  message?: string;
  error?: string;
};

/** Claim the once-per-day Boost Coins reward after the user confirms they posted a listing story. */
export async function claimDailyShareReward(): Promise<DailyShareClaimResult> {
  const res = await clientFetch<DailyShareClaimResult>('/referrals/daily-share', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    return {
      awarded: false,
      alreadyClaimed: false,
      boostCredits: 0,
      creditsAwarded: 0,
      dailyShareClaimedOn: '',
      dailyShareBoostCredits: DAILY_SHARE_BOOST_CREDITS,
      error: res.error ?? 'Nuk u regjistrua shpërblimi ditor.',
    };
  }
  return {
    awarded: Boolean(res.data?.awarded),
    alreadyClaimed: Boolean(res.data?.alreadyClaimed),
    boostCredits: res.data?.boostCredits ?? 0,
    creditsAwarded: res.data?.creditsAwarded ?? 0,
    dailyShareClaimedOn: res.data?.dailyShareClaimedOn ?? '',
    dailyShareBoostCredits: res.data?.dailyShareBoostCredits ?? DAILY_SHARE_BOOST_CREDITS,
    message: res.data?.message,
  };
}
