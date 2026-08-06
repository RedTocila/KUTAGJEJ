'use client';

import * as React from 'react';

import { fetchConversations } from '@/lib/conversations-client';
import { useUser } from '@/hooks/use-user';

function canUseMessages(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

export function useUnreadMessagesCount(pollMs = 30_000): number {
  const { user } = useUser();
  const [count, setCount] = React.useState(0);
  const enabled = canUseMessages(user);

  React.useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const { conversations } = await fetchConversations(1, 50);
      if (cancelled) return;
      const unread = (conversations ?? []).reduce((sum, item) => sum + Math.max(0, item.unreadCount || 0), 0);
      setCount(unread);
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, pollMs]);

  return count;
}
