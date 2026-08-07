'use client';

import * as React from 'react';

type MessagesThreadChromeValue = {
  /**
   * Optimistic override for whether a conversation thread is open on mobile.
   * `null` = follow the URL (`?c=`). Used so the bottom nav can reappear
   * immediately on back, before `router.replace` clears the query.
   */
  setThreadUiOpen: (open: boolean | null) => void;
};

const MessagesThreadChromeContext = React.createContext<MessagesThreadChromeValue | null>(null);

export function MessagesThreadChromeProvider({
  children,
  setThreadUiOpen,
}: {
  children: React.ReactNode;
  setThreadUiOpen: (open: boolean | null) => void;
}) {
  const value = React.useMemo(() => ({ setThreadUiOpen }), [setThreadUiOpen]);
  return (
    <MessagesThreadChromeContext.Provider value={value}>{children}</MessagesThreadChromeContext.Provider>
  );
}

export function useMessagesThreadChrome(): MessagesThreadChromeValue | null {
  return React.useContext(MessagesThreadChromeContext);
}
