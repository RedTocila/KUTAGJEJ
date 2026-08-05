'use client';

import * as React from 'react';

import { HomepageMixedListingCard, mixedListingKey } from '@/components/public/homepage-mixed-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';
import { fetchHomepageRecommendations } from '@/lib/homepage-recommendations';

/**
 * Homepage “Recommended for you” strip.
 * SSR shows latest mixed listings; after mount we swap in personalized
 * results from local search + recently-viewed history when available.
 */
export function HomepageRecommendedSection({
  fallbackItems,
}: {
  fallbackItems: HomepageMixedListing[];
}) {
  const [items, setItems] = React.useState(fallbackItems);
  const fallbackRef = React.useRef(fallbackItems);
  fallbackRef.current = fallbackItems;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const recommended = await fetchHomepageRecommendations(8, fallbackRef.current);
      if (!cancelled && recommended && recommended.length > 0) {
        setItems(recommended);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ListingsSection
      verticalId="real-estate"
      isEmpty={items.length === 0}
      titleKey="recommendedListings"
      useMuiVerticalIcon
      hideTotal
      hideVerticalIcon
      hideSubcategoryPills
      hideBrowseAction
      compactTop
    >
      <ListingsCarousel>
        {items.map((item) => (
          <HomepageMixedListingCard key={mixedListingKey(item)} item={item} />
        ))}
      </ListingsCarousel>
    </ListingsSection>
  );
}
