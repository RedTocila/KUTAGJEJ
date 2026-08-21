'use client';

import * as React from 'react';

import type { MainTabId } from '@/lib/main-tabs';
import { subscribeTabRefresh } from '@/lib/tab-refresh';

/** Register a refetch that runs on pull-to-refresh and tab retap. */
export function useRegisterTabRefresh(tab: MainTabId, handler: () => void | Promise<void>): void {
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  React.useEffect(() => {
    return subscribeTabRefresh(tab, () => handlerRef.current());
  }, [tab]);
}
