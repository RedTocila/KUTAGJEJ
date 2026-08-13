'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Box, Container, Grid, Skeleton, Stack } from '@mui/material';

import { CategoryBrowseSkeleton } from '@/components/public/category-browse-skeleton';
import { ListingDetailSkeleton } from '@/components/public/listing-detail-skeleton';
import { useNavigationPendingPath } from '@/hooks/use-navigation-pending';
import {
  HISTORY_BACK_ATTR,
  canPageNavigateBack,
  isModifiedClick,
} from '@/lib/navigate-back';
import {
  beginPendingNavigation,
  clearPendingNavigation,
  clearPendingNavigationIfMatches,
  pathFromHref,
} from '@/lib/navigation-pending';
import { isPublicBrowsePath, isPublicListingDetailPath } from '@/lib/public-browse-path';
import { paths } from '@/paths';

const PENDING_TIMEOUT_MS = 10_000;

function shouldSkipOverlay(path: string): boolean {
  // These routes paint from cache / their own cards — a full-page loader flashes.
  if (path === paths.user.messages || path.startsWith(`${paths.user.messages}/`)) return true;
  if (path === paths.user.myRealEstateListings || path.startsWith(`${paths.user.myRealEstateListings}/`)) {
    return true;
  }
  if (path === paths.user.notifications || path.startsWith(`${paths.user.notifications}/`)) {
    return true;
  }
  if (path === paths.user.leads || path.startsWith(`${paths.user.leads}/`)) return true;
  return false;
}

function HomePendingSkeleton() {
  return (
    <Box sx={{ bgcolor: 'background.default' }} aria-busy aria-label="Duke u ngarkuar">
      <Skeleton
        variant="rounded"
        animation="wave"
        sx={{ width: '100%', height: { xs: 220, md: 360 }, borderRadius: 0 }}
      />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={4}>
          {Array.from({ length: 2 }).map((_, section) => (
            <Stack key={section} spacing={2}>
              <Skeleton variant="text" animation="wave" width={220} height={36} />
              <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
                {Array.from({ length: 4 }).map((__, i) => (
                  <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
                    <Skeleton variant="rounded" animation="wave" height={180} sx={{ borderRadius: 3 }} />
                    <Skeleton width="70%" sx={{ mt: 1.5 }} />
                    <Skeleton width="40%" />
                  </Box>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

function AppPendingSkeleton() {
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3 } }} aria-busy aria-label="Duke u ngarkuar">
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" animation="wave" width={44} height={44} sx={{ borderRadius: 2.25 }} />
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            <Skeleton variant="text" animation="wave" width={180} height={32} />
            <Skeleton variant="text" animation="wave" width={240} height={20} />
          </Stack>
        </Stack>
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" animation="wave" height={120} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}

function PendingRouteSkeleton({ path }: { path: string }) {
  if (path === paths.home) return <HomePendingSkeleton />;
  if (isPublicBrowsePath(path) || path === paths.public.search) return <CategoryBrowseSkeleton />;
  if (isPublicListingDetailPath(path)) return <ListingDetailSkeleton />;
  return <AppPendingSkeleton />;
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
 * Paints the destination skeleton in the same click turn, before Next.js commits
 * the new route. Chrome (header / side nav / bottom nav) stays above this overlay.
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
      if (anchor.hasAttribute(HISTORY_BACK_ATTR) && canPageNavigateBack()) return;

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
    const timer = window.setTimeout(() => {
      clearPendingNavigation();
    }, PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pendingPath]);

  if (!pendingPath || shouldSkipOverlay(pendingPath)) return null;

  const isAppShell = pendingPath.startsWith('/dashboard') || pendingPath.startsWith('/user/dashboard');

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-busy
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        bgcolor: 'background.default',
        overflow: 'auto',
        pointerEvents: 'auto',
        pl: {
          lg: isAppShell ? 'var(--SideNav-width, 0px)' : 0,
        },
      }}
    >
      <PendingRouteSkeleton path={pendingPath} />
    </Box>
  );
}
