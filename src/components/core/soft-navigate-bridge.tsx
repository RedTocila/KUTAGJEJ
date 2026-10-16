'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { NavigationPendingOverlay } from '@/components/core/navigation-pending-overlay';
import {
  registerAppRouterNavigation,
  unregisterAppRouterNavigation,
} from '@/lib/hard-navigate';
import { setCommittedNavPath } from '@/lib/nav-transition';
import { rememberFirstPageIfNeeded } from '@/lib/navigate-back';
import {
  beginPendingNavigation,
  clearPendingNavigation,
  clearPendingNavigationIfMatches,
  normalizeNavPath,
} from '@/lib/navigation-pending';

const SCROLL_ENTRY_KEY = '__kutagjejScrollEntryKey';
const SCROLL_STORAGE_PREFIX = 'kutagjej:scroll:';
/** Soft back that never commits in React → hard reload, so the skeleton is not a second tap. */
const POP_COMMIT_MS = 8_000;

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
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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
      behavior: 'instant',
    });
    return position.top > maxTop && attempts < maxAttempts;
  };
  const retry = () => {
    if (restore()) frame = window.requestAnimationFrame(retry);
  };
  // First pass runs in the commit so the back view-transition snapshot is already scrolled.
  if (restore()) frame = window.requestAnimationFrame(retry);

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
  const previousUrlRef = React.useRef<string | null>(null);
  const pendingPopNavigationRef = React.useRef(false);
  const scrollEntryKeyRef = React.useRef<string | null>(null);
  const popRecoveryRef = React.useRef<number | null>(null);
  /** One automatic extra back when a pop lands on the same URL (the loading entry). */
  const samePathSkipRef = React.useRef(false);

  React.useEffect(() => {
    registerAppRouterNavigation(
      (href) => {
        beginPendingNavigation(href);
        router.push(href);
      },
      () => {
        router.refresh();
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
      if (popRecoveryRef.current != null) {
        window.clearTimeout(popRecoveryRef.current);
        popRecoveryRef.current = null;
      }

      const landed = `${window.location.pathname}${window.location.search}`;
      // Opening a category records two history entries with the same URL: the
      // loading skeleton, then the page. The first back only reveals that skeleton.
      if (previousUrlRef.current && landed === previousUrlRef.current && !samePathSkipRef.current) {
        samePathSkipRef.current = true;
        window.setTimeout(() => {
          window.history.back();
        }, 0);
        return;
      }
      samePathSkipRef.current = false;

      // Browser URL already updated; React pathname may stall on a hung flight home.
      if (normalizeNavPath(window.location.pathname) !== '/') return;
      popRecoveryRef.current = window.setTimeout(() => {
        popRecoveryRef.current = null;
        if (normalizeNavPath(window.location.pathname) === '/') {
          window.location.reload();
        }
      }, POP_COMMIT_MS);
    };
    const saveCurrentPosition = () => {
      if (scrollEntryKeyRef.current) saveScrollPosition(scrollEntryKeyRef.current);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pagehide', saveCurrentPosition);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pagehide', saveCurrentPosition);
      if (popRecoveryRef.current != null) {
        window.clearTimeout(popRecoveryRef.current);
        popRecoveryRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer = 0;
    const saveOnScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (scrollEntryKeyRef.current) saveScrollPosition(scrollEntryKeyRef.current);
      }, 160);
    };

    window.addEventListener('scroll', saveOnScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', saveOnScroll);
      window.clearTimeout(timer);
    };
  }, []);

  React.useLayoutEffect(() => {
    const entryKey = getScrollEntryKey();
    scrollEntryKeyRef.current = entryKey;
    const routeChanged = previousPathnameRef.current !== pathname;
    const isPopNavigation = pendingPopNavigationRef.current;
    pendingPopNavigationRef.current = false;

    previousUrlRef.current = `${window.location.pathname}${window.location.search}`;
    if (popRecoveryRef.current != null && normalizeNavPath(pathname ?? '') === normalizeNavPath(window.location.pathname)) {
      window.clearTimeout(popRecoveryRef.current);
      popRecoveryRef.current = null;
    }

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
    setCommittedNavPath(pathname);
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
