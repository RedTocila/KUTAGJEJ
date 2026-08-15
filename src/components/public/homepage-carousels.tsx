import * as React from 'react';

import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import type { PublicListingsBundle } from '@/lib/public-listings-client';
import { HomepageCommunityBanner, HomepagePostBanner } from '@/components/public/homepage-community-banner';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { LazyHomeSection } from '@/components/public/lazy-home-section';
import { SeoIntroSection } from '@/components/public/seo-intro-section';

/** Shared homepage listing carousels — used by SSR feed and the session-cache fallback. */
export function HomepageCarousels({
  bundle,
  ssrOk = true,
}: {
  bundle: PublicListingsBundle;
  ssrOk?: boolean;
}): React.JSX.Element {
  const latestMixed = buildHomepageMixedLatest(bundle, 8);
  const totals = bundle.totals;

  return (
    <>
      <HomepageRecommendedSection fallbackItems={latestMixed} />

      <HomepageOkazionSection listings={bundle.okazion} total={bundle.okazionTotal} ssrOk={ssrOk} />

      <LazyHomeSection
        verticalId="real-estate"
        initialListings={bundle.realEstate}
        initialTotal={totals.realEstate}
        initialOk={ssrOk}
        eager
      />

      <LazyHomeSection
        verticalId="cars"
        initialListings={bundle.cars}
        initialTotal={totals.cars}
        initialOk={ssrOk}
      />

      <HomepageCommunityBanner activeListingsCount={totals.realEstate + totals.cars + totals.jobs} />

      <LazyHomeSection verticalId="jobs" initialListings={bundle.jobs} initialTotal={totals.jobs} initialOk={ssrOk} />

      <LazyHomeSection
        verticalId="marketplace"
        initialListings={bundle.marketplace}
        initialTotal={totals.marketplace}
        initialOk={ssrOk}
      />

      <LazyHomeSection
        verticalId="businesses"
        initialListings={bundle.businesses}
        initialTotal={totals.businesses}
        initialOk={ssrOk}
      />

      <LazyHomeSection
        verticalId="professionals"
        initialListings={bundle.professionals}
        initialTotal={totals.professionals}
        initialOk={ssrOk}
      />

      <HomepagePostBanner />

      <SeoIntroSection />
    </>
  );
}
