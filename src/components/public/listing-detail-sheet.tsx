'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box } from '@mui/material';

import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useSwipeToDismiss } from '@/hooks/use-swipe-to-dismiss';
import { navigatePageBack } from '@/lib/navigate-back';
import {
  isPublicListingDetailPath,
  listingBrowseRootFromPath,
} from '@/lib/public-browse-path';
import { paths } from '@/paths';

const MOBILE_SHEET_MQ = '(max-width: 899.95px)';

function useIsMobileListingSheet(): boolean {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(MOBILE_SHEET_MQ);
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia(MOBILE_SHEET_MQ).matches,
    () => false,
  );
}

/**
 * Mobile listing detail: fixed sheet that slides up from the bottom (page behind
 * stays put). Pull-to-dismiss when the sheet is scrolled to the top.
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
  const isMobile = useIsMobileListingSheet();
  const isMobileListing = isListing && isMobile;
  const [enterDone, setEnterDone] = React.useState(false);
  const sheetElRef = React.useRef<HTMLElement | null>(null);

  useLockBodyScroll(isMobileListing);

  React.useEffect(() => {
    setEnterDone(false);
  }, [pathname]);

  const fallbackHref = listingBrowseRootFromPath(pathname) ?? paths.home;
  const dismissEnabled = isMobileListing && enterDone;

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
      sheetElRef.current = node;
      dismiss.setTarget(node);
      // Sheet owns its own scroll — not the document.
      dismiss.setScrollParent(node);
    },
    [dismiss.setTarget, dismiss.setScrollParent],
  );

  const pinSheetTop = React.useCallback(() => {
    const el = sheetElRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  React.useLayoutEffect(() => {
    if (!isMobileListing) return;
    pinSheetTop();
  }, [pathname, isMobileListing, pinSheetTop]);

  const markEnterDone = React.useCallback(() => {
    setEnterDone(true);
    pinSheetTop();
  }, [pinSheetTop]);

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
      data-scroll-lock-allow=""
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
        width: '100%',
        minHeight: '100%',
        // Fixed sheet via CSS so first paint already covers the viewport (no page scroll).
        '@media (max-width: 899.95px)': {
          position: 'fixed',
          inset: 0,
          zIndex: (theme) => theme.zIndex.modal,
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
