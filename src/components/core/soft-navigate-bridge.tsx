'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { NavigationPendingOverlay } from '@/components/core/navigation-pending-overlay';
import {
  registerAppRouterNavigation,
  unregisterAppRouterNavigation,
} from '@/lib/hard-navigate';
import { rememberFirstPageIfNeeded } from '@/lib/navigate-back';
import { beginPendingNavigation, clearPendingNavigationIfMatches } from '@/lib/navigation-pending';
import { isPublicListingDetailPath } from '@/lib/public-browse-path';

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
 * Resets window scroll on pathname change, except listing sheet enter/leave
 * (sheet scrolls itself; body-lock restores browse scroll on dismiss).
 */
export function SoftNavigateBridge({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const prevPathnameRef = React.useRef(pathname);

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
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    rememberFirstPageIfNeeded();

    const enteringListing = isPublicListingDetailPath(pathname);
    const leavingListing = isPublicListingDetailPath(prev) && !enteringListing;
    if (!enteringListing && !leavingListing) {
      scrollWindowToTop();
    }

    clearPendingNavigationIfMatches(pathname);
  }, [pathname]);

  return (
    <>
      {children}
      <NavigationPendingOverlay />
    </>
  );
}
