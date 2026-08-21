'use client';

import * as React from 'react';

import { prefetchConversations } from '@/lib/conversations-client';
import { prefetchSavedListings } from '@/lib/listing-metrics';
import { useUser } from '@/hooks/use-user';

function canWarm(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

/** Prefetch inbox + saved cards while the user is still on Home. */
export function useWarmMainTabs(): void {
  const { user, isLoading } = useUser();
  const enabled = canWarm(user);

  React.useEffect(() => {
    if (isLoading || !enabled) return;
    void prefetchConversations();
    void prefetchSavedListings();
    void import('@/app/user/dashboard/page');
  }, [enabled, isLoading]);
}
