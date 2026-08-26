'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box } from '@mui/material';

import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss';
import { navigatePageBack } from '@/lib/navigate-back';
import {
  isPublicListingDetailPath,
  listingBrowseRootFromPath,
} from '@/lib/public-browse-path';
import { paths } from '@/paths';

const MOBILE_SHEET_MQ = '(max-width: 899.95px)';

/**
 * Mobile listing detail: slides up from the bottom on open, and pull-to-dismiss
 * when scrolled to the top (same gesture language as bottom sheets / lightbox).
 * Desktop keeps a soft fade. Non-listing routes pass through unchanged.
 */
export function ListingDetailSheet({
  children,
  fadeClassName,
}: {
  children: React.ReactNode;
  /** Applied when this is not a listing detail route. */
  fadeClassName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isListing = isPublicListingDetailPath(pathname);
  const [isMobile, setIsMobile] = React.useState(false);
  const [enterDone, setEnterDone] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(MOBILE_SHEET_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  React.useEffect(() => {
    setEnterDone(false);
  }, [pathname]);

  const fallbackHref = listingBrowseRootFromPath(pathname) ?? paths.home;
  const dismissEnabled = isListing && isMobile && enterDone;

  const onDismiss = React.useCallback(() => {
    navigatePageBack(router, fallbackHref);
  }, [router, fallbackHref]);

  const dismiss = useSwipeToDismiss({
    enabled: dismissEnabled,
    requireScrollTop: true,
    fadeTarget: true,
    thresholdPx: 110,
    onDismiss,
  });

  const setSheetRef = React.useCallback(
    (node: HTMLElement | null) => {
      dismiss.setTarget(node);
      dismiss.setScrollParent(node ? document.documentElement : null);
    },
    [dismiss.setTarget, dismiss.setScrollParent],
  );

  React.useEffect(() => {
    if (!isListing || !isMobile) return;
    const html = document.documentElement;
    const prev = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'none';
    return () => {
      html.style.overscrollBehaviorY = prev;
    };
  }, [isListing, isMobile]);

  const markEnterDone = React.useCallback(() => {
    setEnterDone(true);
  }, []);

  React.useEffect(() => {
    if (!isListing || enterDone) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      markEnterDone();
      return undefined;
    }
    // Safety if animationend is skipped (tab backgrounded, etc.).
    const timeout = window.setTimeout(markEnterDone, 420);
    return () => window.clearTimeout(timeout);
  }, [isListing, enterDone, markEnterDone, pathname]);

  if (!isListing) {
    return fadeClassName ? <Box className={fadeClassName}>{children}</Box> : <>{children}</>;
  }

  return (
    <Box
      ref={setSheetRef}
      className={enterDone ? undefined : 'kutagjej-listing-sheet'}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (
          event.animationName !== 'kutagjejListingSheetIn' &&
          event.animationName !== 'kutagjejFadeIn'
        ) {
          return;
        }
        markEnterDone();
      }}
      {...(isMobile ? dismiss.paperBind : {})}
      sx={{
        bgcolor: 'background.default',
        minHeight: '100%',
        width: '100%',
      }}
    >
      {children}
    </Box>
  );
}
