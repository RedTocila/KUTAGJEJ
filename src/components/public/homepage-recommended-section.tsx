'use client';

import * as React from 'react';

import { HomepageMixedListingCard, mixedListingKey } from '@/components/public/homepage-mixed-listing-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';

/**
 * Homepage “Recommended for you” strip.
 * Uses SSR mixed latest only — no post-mount browse waterfall.
 */
export function HomepageRecommendedSection({
  fallbackItems,
}: {
  fallbackItems: HomepageMixedListing[];
}) {
  return (
    <ListingsSection
      verticalId="real-estate"
      isEmpty={fallbackItems.length === 0}
      titleKey="recommendedListings"
      useMuiVerticalIcon
      hideTotal
      hideVerticalIcon
      hideSubcategoryPills
      hideBrowseAction
      compactTop
    >
      <ListingsCarousel>
        {fallbackItems.map((item, index) => (
          <HomepageMixedListingCard
            key={mixedListingKey(item)}
            item={item}
            imagePriority={index < 4}
          />
        ))}
      </ListingsCarousel>
    </ListingsSection>
  );
}
