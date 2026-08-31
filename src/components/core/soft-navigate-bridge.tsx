'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { NavigationPendingOverlay } from '@/components/core/navigation-pending-overlay';
import {
  registerAppRouterNavigation,
  unregisterAppRouterNavigation,
} from '@/lib/hard-navigate';
import { rememberFirstPageIfNeeded } from '@/lib/navigate-back';
import {
  beginPendingNavigation,
  clearPendingNavigation,
  clearPendingNavigationIfMatches,
} from '@/lib/navigation-pending';

const SCROLL_ENTRY_KEY = '__kutagjejScrollEntryKey';
const SCROLL_STORAGE_PREFIX = 'kutagjej:scroll:';

type ScrollPosition = {
  left: number;
  top: number;
};

function createScrollEntryKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getScrollEntryKey(): string {
  const currentState =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  const existingKey = (currentState as Record<string, unknown>)[SCROLL_ENTRY_KEY];
  if (typeof existingKey === 'string' && existingKey) return existingKey;

  const key = createScrollEntryKey();
  window.history.replaceState({ ...currentState, [SCROLL_ENTRY_KEY]: key }, '', window.location.href);
  return key;
}

function saveScrollPosition(entryKey: string): void {
  try {
    sessionStorage.setItem(
      `${SCROLL_STORAGE_PREFIX}${entryKey}`,
      JSON.stringify({ left: window.scrollX, top: window.scrollY } satisfies ScrollPosition),
    );
  } catch {
    // Private mode / storage blocked.
  }
}

function readScrollPosition(entryKey: string): ScrollPosition | null {
  try {
    const raw = sessionStorage.getItem(`${SCROLL_STORAGE_PREFIX}${entryKey}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed == null ||
      typeof (parsed as ScrollPosition).left !== 'number' ||
      typeof (parsed as ScrollPosition).top !== 'number'
    ) {
      return null;
    }
    return parsed as ScrollPosition;
  } catch {
    return null;
  }
}

function scrollWindowToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function restoreScrollPosition(entryKey: string): () => void {
  const position = readScrollPosition(entryKey);
  if (!position) return () => undefined;

  let frame = 0;
  let attempts = 0;
  const maxAttempts = 60;
  const restore = () => {
    attempts += 1;
    const maxTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({
      left: position.left,
      top: Math.min(position.top, maxTop),
      behavior: 'auto',
    });
    if (position.top > maxTop && attempts < maxAttempts) {
      frame = window.requestAnimationFrame(restore);
    }
  };
  frame = window.requestAnimationFrame(restore);

  return () => window.cancelAnimationFrame(frame);
}

/**
 * Registers App Router `push` / `refresh` for imperative helpers in `hard-navigate.ts`.
 * Keeps in-app clicks instant (no full document reload).
 * New navigations start at the top; Back/Forward restores the saved position for
 * the browser history entry being returned to.
 */
export function SoftNavigateBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const previousPathnameRef = React.useRef(pathname);
  const pendingPopNavigationRef = React.useRef(false);
  const scrollEntryKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    registerAppRouterNavigation(
      (href) => {
        beginPendingNavigation(href);
        React.startTransition(() => {
          router.push(href);
        });
      },
      () => {
        React.startTransition(() => {
          router.refresh();
        });
      },
    );
    return () => {
      unregisterAppRouterNavigation();
    };
  }, [router]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    history.scrollRestoration = 'manual';

    const handlePopState = () => {
      clearPendingNavigation();
      pendingPopNavigationRef.current = true;
    };
    const saveCurrentPosition = () => {
      if (scrollEntryKeyRef.current) saveScrollPosition(scrollEntryKeyRef.current);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pagehide', saveCurrentPosition);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pagehide', saveCurrentPosition);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;
    const saveOnScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (scrollEntryKeyRef.current) saveScrollPosition(scrollEntryKeyRef.current);
      });
    };

    window.addEventListener('scroll', saveOnScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', saveOnScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  React.useLayoutEffect(() => {
    const entryKey = getScrollEntryKey();
    scrollEntryKeyRef.current = entryKey;
    const routeChanged = previousPathnameRef.current !== pathname;
    const isPopNavigation = pendingPopNavigationRef.current;
    pendingPopNavigationRef.current = false;

    rememberFirstPageIfNeeded();
    let cancelRestore: (() => void) | undefined;
    if (routeChanged) {
      if (isPopNavigation) {
        cancelRestore = restoreScrollPosition(entryKey);
      } else {
        scrollWindowToTop();
      }
    }
    previousPathnameRef.current = pathname;
    clearPendingNavigationIfMatches(pathname);

    return () => {
      cancelRestore?.();
    };
  }, [pathname]);

  return (
    <>
      {children}
      <NavigationPendingOverlay />
    </>
  );
}
