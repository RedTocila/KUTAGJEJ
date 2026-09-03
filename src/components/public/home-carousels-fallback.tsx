'use client';

import * as React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

import { HomepageBelowFold, HomepageCarousels } from '@/components/public/homepage-carousels';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { HomeCarouselsSkeleton } from '@/components/public/homepage-skeletons';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import {
  getHomepageListingsCacheServerSnapshot,
  getHomepageListingsCacheSnapshot,
  subscribeHomepageListingsCache,
  writeHomepageListingsCache,
} from '@/lib/homepage-session-cache';
import { fetchHomepageListings } from '@/lib/public-listings-client';

function useHomepageCache() {
  return React.useSyncExternalStore(
    subscribeHomepageListingsCache,
    getHomepageListingsCacheSnapshot,
    getHomepageListingsCacheServerSnapshot,
  );
}

function HomeFetchError({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 4, md: 6 } }} role="alert">
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <Stack spacing={1.5} sx={{ alignItems: 'flex-start', maxWidth: 420 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Nuk u arrit lidhja me serverin.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provoni përsëri — njoftimet nuk u ngarkuan.
          </Typography>
          <Button variant="contained" onClick={onRetry} sx={{ fontWeight: 700 }}>
            Rifresko
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * Paints the last homepage from sessionStorage while RSC/API catch up.
 * `refresh` revalidates in the background. With an empty cache, always fetches
 * so soft-nav / tab-preview shells never sit on skeletons forever.
 */
export function HomeCarouselsFallback({ refresh = false }: { refresh?: boolean }): React.JSX.Element {
  const stored = useHomepageCache();
  const [refreshed, setRefreshed] = React.useState<typeof stored>(null);
  const [failed, setFailed] = React.useState(false);
  const [retryKey, setRetryKey] = React.useState(0);
  const bundle = refreshed ?? stored;

  React.useEffect(() => {
    const cached = getHomepageListingsCacheSnapshot();
    // Already have paint + not asked to refresh + not a manual retry → stay put.
    if (!refresh && cached && retryKey === 0) return;

    let cancelled = false;
    setFailed(false);
    void (async () => {
      const res = await fetchHomepageListings(8);
      if (cancelled) return;
      if (!res.ok) {
        if (!getHomepageListingsCacheSnapshot()) setFailed(true);
        return;
      }
      writeHomepageListingsCache(res);
      setRefreshed(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, retryKey]);

  if (bundle) return <HomepageCarousels bundle={bundle} ssrOk />;
  if (failed) {
    return (
      <HomeFetchError
        onRetry={() => {
          setFailed(false);
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }
  return <HomeCarouselsSkeleton />;
}

/**
 * Instant recommended row from session cache, otherwise recover via client fetch
 * (avoids locking on Suspense / loading skeletons when soft nav stalls).
 */
export function HomeRecommendedFallback(): React.JSX.Element {
  const stored = useHomepageCache();
  const mixed = stored ? buildHomepageMixedLatest(stored, 8) : [];
  return <HomepageRecommendedSection fallbackItems={mixed} ssrOk={mixed.length > 0} />;
}

/**
 * Instant OKAZION row from session cache, otherwise recover via client fetch.
 */
export function HomeOkazionFallback(): React.JSX.Element {
  const stored = useHomepageCache();
  if (stored?.okazion.length) {
    return <HomepageOkazionSection listings={stored.okazion} total={stored.okazionTotal} ssrOk />;
  }
  return <HomepageOkazionSection listings={[]} total={0} ssrOk={false} />;
}

export function HomeBelowFoldFallback(): React.JSX.Element {
  return <HomepageBelowFold />;
}
