'use client';

import * as React from 'react';

import { useUser } from '@/hooks/use-user';
import { fetchMyReferralStats } from '@/lib/referrals-client';

const MAX_LIFETIME_PERCENT = 50;

export function clampLifetimePercent(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_LIFETIME_PERCENT, n);
}

export function applyLifetimeDiscount(amountEur: number, percent: number): number {
  const list = Number(amountEur);
  if (!Number.isFinite(list) || list <= 0) return 0;
  const p = clampLifetimePercent(percent);
  if (p <= 0) return Math.round(list * 100) / 100;
  const listMinor = Math.round(list * 100);
  const discountedMinor = Math.max(1, Math.round(listMinor * (1 - p / 100)));
  return discountedMinor / 100;
}

let cached: { percent: number; at: number; userId: string } | null = null;
const TTL_MS = 30_000;

/** Earned lifetime % from referral badges — used to show discounted package prices. */
export function useLifetimePackageDiscount(): number {
  const { user } = useUser();
  const userId = user?.id || '';
  const [percent, setPercent] = React.useState(() =>
    cached && cached.userId === userId ? cached.percent : 0,
  );

  React.useEffect(() => {
    if (!userId) {
      setPercent(0);
      return;
    }
    if (cached && cached.userId === userId && Date.now() - cached.at < TTL_MS) {
      setPercent(cached.percent);
      return;
    }
    let cancelled = false;
    void fetchMyReferralStats().then((res) => {
      if (cancelled) return;
      const next = clampLifetimePercent(Number(res.referral?.lifetimePercent) || 0);
      cached = { percent: next, at: Date.now(), userId };
      setPercent(next);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return percent;
}
