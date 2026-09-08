'use client';

import * as React from 'react';

import {
  listUserNotifications,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { useUser } from '@/hooks/use-user';

/** Shared inbox poller — Menu + FAB used to each hit `/user-notifications` on their own timer. */
const DEFAULT_POLL_MS = 90_000;

type InboxSnapshot = {
  unread: number;
  items: UserNotification[];
  loading: boolean;
};

let snapshot: InboxSnapshot = { unread: 0, items: [], loading: false };
const listeners = new Set<(next: InboxSnapshot) => void>();
let pollTimer: number | null = null;
let inFlight: Promise<void> | null = null;
let pollStarted = false;
let activeSubscribers = 0;

function canUseNotifications(user: ReturnType<typeof useUser>['user']): boolean {
  return Boolean(
    user &&
      (user.accountType === 'individual' ||
        user.accountType === 'business' ||
        user.role === 'business-user'),
  );
}

function emit(next: InboxSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener(snapshot);
}

async function loadInboxOnce(): Promise<void> {
  if (inFlight) return inFlight;
  emit({ ...snapshot, loading: true });
  inFlight = (async () => {
    const res = await listUserNotifications(false, 16);
    if (!res.error) {
      emit({
        unread: res.unread ?? 0,
        items: res.notifications ?? [],
        loading: false,
      });
      return;
    }
    emit({ ...snapshot, loading: false });
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function ensurePoller(pollMs: number) {
  if (pollStarted) return;
  pollStarted = true;
  void loadInboxOnce();
  if (pollTimer != null) window.clearInterval(pollTimer);
  pollTimer = window.setInterval(() => {
    void loadInboxOnce();
  }, pollMs);
}

function stopPollerIfIdle() {
  if (activeSubscribers > 0) return;
  pollStarted = false;
  if (pollTimer != null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function useUserNotificationsInbox(pollMs = DEFAULT_POLL_MS): {
  canUse: boolean;
  unread: number;
  items: UserNotification[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useUser();
  const canUse = canUseNotifications(user);
  const [state, setState] = React.useState<InboxSnapshot>(snapshot);

  const refresh = React.useCallback(async () => {
    if (!canUse) return;
    await loadInboxOnce();
  }, [canUse]);

  React.useEffect(() => {
    if (!canUse) {
      emit({ unread: 0, items: [], loading: false });
      setState({ unread: 0, items: [], loading: false });
      return;
    }

    const onUpdate = (next: InboxSnapshot) => setState(next);
    listeners.add(onUpdate);
    activeSubscribers += 1;
    setState(snapshot);
    ensurePoller(pollMs);

    return () => {
      listeners.delete(onUpdate);
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      stopPollerIfIdle();
    };
  }, [canUse, pollMs]);

  return {
    canUse,
    unread: state.unread,
    items: state.items,
    loading: state.loading,
    refresh,
  };
}
