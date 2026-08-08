'use client';

import * as React from 'react';

import { listMySubscriptions } from '@/lib/payments-client';
import { useUser } from '@/hooks/use-user';

function hasActiveGrowOrElite(
  subscriptions: Awaited<ReturnType<typeof listMySubscriptions>>['subscriptions'],
): boolean {
  const now = Date.now();
  return (subscriptions || []).some((sub) => {
    const plan = String(sub.planCode || '').toLowerCase();
    if (plan !== 'grow' && plan !== 'elite') return false;
    if (sub.status !== 'active') return false;
    if ((sub.priceEur ?? 0) <= 0) return false;
    if (sub.expiresAt && new Date(sub.expiresAt).getTime() < now) return false;
    return true;
  });
}

/** True when the signed-in user has an active paid Grow or Elite subscription. */
export function useGrowOrEliteEntitlement(): boolean | null {
  const { user } = useUser();
  const [entitled, setEntitled] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!user?.id) {
      setEntitled(false);
      return;
    }
    let cancelled = false;
    void listMySubscriptions().then((res) => {
      if (cancelled) return;
      setEntitled(hasActiveGrowOrElite(res.subscriptions));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return entitled;
}
