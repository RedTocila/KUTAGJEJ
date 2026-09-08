'use client';

import * as React from 'react';

import { fetchUnreadMessagesCount } from '@/lib/conversations-client';
import { useUser } from '@/hooks/use-user';

/** Survives public ↔ dashboard shell remounts so the badge does not flash to 0. */
let cachedUnreadCount = 0;

/** One shared poller for the whole app — MobileBottomNav + side/mobile navs used to each poll. */
const DEFAULT_POLL_MS = 90_000;
const listeners = new Set<(count: number) => void>();
let pollTimer: number | null = null;
let inFlight: Promise<void> | null = null;
let pollStarted = false;

function canUseMessages(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

function emitUnread(count: number) {
  cachedUnreadCount = Math.max(0, count);
  for (const listener of listeners) listener(cachedUnreadCount);
}

async function loadUnreadOnce(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { unreadCount, error } = await fetchUnreadMessagesCount();
    // Keep the previous count on transient failures / empty error responses.
    if (error || unreadCount == null) return;
    emitUnread(unreadCount);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function ensureUnreadPoller(pollMs: number) {
  if (pollStarted) return;
  pollStarted = true;
  void loadUnreadOnce();
  if (pollTimer != null) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => {
    void loadUnreadOnce();
  }, pollMs);
}

function stopUnreadPollerIfIdle() {
  if (listeners.size > 0) return;
  pollStarted = false;
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function useUnreadMessagesCount(pollMs = DEFAULT_POLL_MS): number {
  const { user, isLoading } = useUser();
  const [count, setCount] = React.useState(cachedUnreadCount);
  const enabled = canUseMessages(user);

  React.useEffect(() => {
    if (!enabled) {
      // Keep the badge while session is still restoring after a remount.
      if (!isLoading) {
        emitUnread(0);
        setCount(0);
      }
      return;
    }

    const onUpdate = (next: number) => setCount(next);
    listeners.add(onUpdate);
    setCount(cachedUnreadCount);
    ensureUnreadPoller(pollMs);

    return () => {
      listeners.delete(onUpdate);
      stopUnreadPollerIfIdle();
    };
  }, [enabled, isLoading, pollMs]);

  return count;
}

/** Optimistically sync the nav badge after mark-read / send flows. */
export function setCachedUnreadMessagesCount(next: number): void {
  emitUnread(next);
}
