'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { NavigationPendingOverlay } from '@/components/core/navigation-pending-overlay';
import {
  registerAppRouterNavigation,
  unregisterAppRouterNavigation,
} from '@/lib/hard-navigate';
import { beginPendingNavigation, clearPendingNavigationIfMatches } from '@/lib/navigation-pending';

function scrollWindowToTop() {
  if (typeof window === 'undefined') return;
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

/**
 * Registers App Router `push` / `refresh` for imperative helpers in `hard-navigate.ts`.
 * Keeps in-app clicks instant (no full document reload).
 * Also resets scroll to the top on every pathname change (e.g. opening a listing).
 */
export function SoftNavigateBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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

  React.useLayoutEffect(() => {
    scrollWindowToTop();
    clearPendingNavigationIfMatches(pathname);
  }, [pathname]);

  return (
    <>
      {children}
      <NavigationPendingOverlay />
    </>
  );
}
