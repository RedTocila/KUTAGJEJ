'use client';

import * as React from 'react';

import type { MainTabId } from '@/lib/main-tabs';
import { subscribePageRefresh, subscribeTabRefresh } from '@/lib/tab-refresh';

/** Register a refetch that runs when the current tab is retapped. */
export function useRegisterTabRefresh(tab: MainTabId, handler: () => void | Promise<void>): void {
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  React.useEffect(() => {
    return subscribeTabRefresh(tab, () => handlerRef.current());
  }, [tab]);
}

/** Register a refetch for a screen outside the main tabs, such as a category page. */
export function useRegisterPageRefresh(handler: () => void | Promise<void>): void {
  const handlerRef = React.useRef(handler);
  handlerRef.current = handler;

  React.useEffect(() => {
    return subscribePageRefresh(() => handlerRef.current());
  }, []);
}
