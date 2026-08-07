'use client';

import * as React from 'react';

import { fetchUnreadMessagesCount, prefetchConversations } from '@/lib/conversations-client';
import { useUser } from '@/hooks/use-user';

/** Survives public ↔ dashboard shell remounts so the badge does not flash to 0. */
let cachedUnreadCount = 0;

function canUseMessages(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

export function useUnreadMessagesCount(pollMs = 30_000): number {
  const { user, isLoading } = useUser();
  const [count, setCount] = React.useState(cachedUnreadCount);
  const enabled = canUseMessages(user);

  React.useEffect(() => {
    if (!enabled) {
      // Keep the badge while session is still restoring after a remount.
      if (!isLoading) {
        cachedUnreadCount = 0;
        setCount(0);
      }
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { unreadCount, error } = await fetchUnreadMessagesCount();
      if (cancelled) return;
      // Keep the previous count on transient failures / empty error responses.
      if (error || unreadCount == null) return;
      cachedUnreadCount = Math.max(0, unreadCount);
      setCount(cachedUnreadCount);
    };

    // Warm inbox in the background so tapping Chats paints immediately.
    void prefetchConversations();
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, isLoading, pollMs]);

  return count;
}

/** Optimistically sync the nav badge after mark-read / send flows. */
export function setCachedUnreadMessagesCount(next: number): void {
  cachedUnreadCount = Math.max(0, next);
}
