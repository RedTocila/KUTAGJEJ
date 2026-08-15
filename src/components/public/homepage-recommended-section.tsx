'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import { buildHomepageMixedLatest, type HomepageMixedListing } from '@/lib/homepage-latest-listings';
import { fetchHomepageListings } from '@/lib/public-listings-client';
import { HomepageMixedListingCard, mixedListingKey } from '@/components/public/homepage-mixed-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';

function CarouselSkeleton() {
  return (
    <Stack direction="row" spacing={2} sx={{ overflow: 'hidden', px: { xs: 2, md: 0 } }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
          <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />
          <Skeleton width="70%" sx={{ mt: 1.5 }} />
          <Skeleton width="40%" />
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Homepage “Recommended for you” strip.
 * Prefers SSR mixed latest; if SSR came back empty (often a cold API timeout),
 * retries once on the client instead of locking on a false empty state.
 */
export function HomepageRecommendedSection({ fallbackItems }: { fallbackItems: HomepageMixedListing[] }) {
  const needsRecovery = fallbackItems.length === 0;
  const [items, setItems] = React.useState(fallbackItems);
  const [loading, setLoading] = React.useState(needsRecovery);

  React.useEffect(() => {
    if (!needsRecovery) return;
    let cancelled = false;
    void (async () => {
      const bundle = await fetchHomepageListings(8);
      if (cancelled) return;
      setItems(buildHomepageMixedLatest(bundle, 8));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [needsRecovery]);

  return (
    <ListingsSection
      verticalId="real-estate"
      isEmpty={!loading && items.length === 0}
      titleKey="recommendedListings"
      useMuiVerticalIcon
      hideTotal
      hideVerticalIcon
      hideSubcategoryPills
      hideBrowseAction
      compactTop
    >
      {loading ? (
        <CarouselSkeleton />
      ) : (
        <ListingsCarousel>
          {items.map((item) => (
            <HomepageMixedListingCard key={mixedListingKey(item)} item={item} />
          ))}
        </ListingsCarousel>
      )}
    </ListingsSection>
  );
}
