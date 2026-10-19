'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { RouteLoadingSkeleton, skeletonKindForPath } from '@/components/core/route-loading-skeleton';
import { paths } from '@/paths';
import { mainTabFromPath } from '@/lib/main-tabs';
import { HISTORY_BACK_ATTR, isModifiedClick } from '@/lib/navigate-back';
import {
  beginPendingNavigation,
  clearPendingNavigation,
  clearPendingNavigationIfMatches,
  normalizeNavPath,
  pathFromHref,
} from '@/lib/navigation-pending';
import { isPostListingPath } from '@/lib/post-listing-path';
import { isPublicListingDetailPath } from '@/lib/public-browse-path';
import { useNavigationPendingPath } from '@/hooks/use-navigation-pending';

const PENDING_TIMEOUT_MS = 10_000;
/** Soft-nav to home that never commits → full document load (avoids an endless splash). */
const HOME_SOFT_NAV_FALLBACK_MS = 8_000;

function shouldSkipOverlay(path: string, currentPath: string): boolean {
  // These routes paint from cache / their own cards — a full-page loader flashes.
  if (path === paths.user.messages || path.startsWith(`${paths.user.messages}/`)) return true;
  if (path === paths.user.savedListings) return true;
  if (path === paths.user.dashboard) return true;
  if (path === paths.user.myRealEstateListings || path.startsWith(`${paths.user.myRealEstateListings}/`)) {
    return true;
  }
  if (path === paths.user.notifications || path.startsWith(`${paths.user.notifications}/`)) {
    return true;
  }
  if (isPublicListingDetailPath(path)) return true;
  // Form chrome paints from the URL on the next frame — a full-page skeleton feels stuck.
  if (isPostListingPath(path)) return true;
  // Home ↔ Saves ↔ Messages ↔ Profile is a hosted pager on mobile; don't cover it.
  if (mainTabFromPath(path) && mainTabFromPath(currentPath)) return true;
  return false;
}

function isInternalAnchorNavigation(anchor: HTMLAnchorElement): string | null {
  if (anchor.hasAttribute('download')) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  const hrefAttr = anchor.getAttribute('href');
  if (!hrefAttr) return null;
  const trimmed = hrefAttr.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  return pathFromHref(url.pathname);
}

/**
 * Covers the current page with a skeleton in the same click turn, before Next.js
 * commits the new route. The branded splash is only the cold start.
 */
export function NavigationPendingOverlay(): React.JSX.Element | null {
  const pathname = usePathname();
  const pendingPath = useNavigationPendingPath();

  React.useLayoutEffect(() => {
    clearPendingNavigationIfMatches(pathname);
  }, [pathname]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      // Save/share/etc. sit inside listing cards that are links — don't treat those as nav.
      const nestedInteractive = target.closest('button, [role="button"], input, select, textarea, a[href]');
      if (nestedInteractive && nestedInteractive !== anchor) return;
      const nextPath = isInternalAnchorNavigation(anchor);
      if (!nextPath) return;
      if (anchor.hasAttribute(HISTORY_BACK_ATTR)) {
        // Back navigation should reveal the previous page immediately instead
        // of covering it with the destination skeleton.
        clearPendingNavigation();
        return;
      }

      beginPendingNavigation(nextPath);
    };

    const onPopState = () => {
      clearPendingNavigation();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  React.useEffect(() => {
    if (!pendingPath) return undefined;
    const target = pendingPath;
    const isHome = target === paths.home;
    const timer = window.setTimeout(() => {
      clearPendingNavigation();
      // Soft nav never committed — hard load so the user is not stuck on the skeleton.
      if (
        isHome &&
        typeof window !== 'undefined' &&
        normalizeNavPath(window.location.pathname) !== paths.home
      ) {
        window.location.assign(paths.home);
      }
    }, isHome ? HOME_SOFT_NAV_FALLBACK_MS : PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pendingPath]);

  if (!pendingPath || shouldSkipOverlay(pendingPath, pathname ?? '')) return null;
  // Hide in the same commit as the route so the settle view transition captures the real page.
  if (pathname && normalizeNavPath(pathname) === pendingPath) return null;

  return <RouteLoadingSkeleton kind={skeletonKindForPath(pendingPath)} cover />;
}
