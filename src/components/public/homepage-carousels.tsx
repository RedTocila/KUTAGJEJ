import * as React from 'react';

import { HomepageCommunityBanner, HomepagePostBanner } from '@/components/public/homepage-community-banner';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { LazyHomeSection } from '@/components/public/lazy-home-section';
import { SeoIntroSection } from '@/components/public/seo-intro-section';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import type { PublicListingsBundle } from '@/lib/public-listings-client';

/** Shared homepage listing carousels — used by the session-cache fallback. */
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
      <HomepageRecommendedSection fallbackItems={latestMixed} ssrOk={ssrOk} />

      <HomepageOkazionSection listings={bundle.okazion} total={bundle.okazionTotal} ssrOk={ssrOk} />

      <HomepageBelowFold
        realEstate={bundle.realEstate}
        cars={bundle.cars}
        jobs={bundle.jobs}
        marketplace={bundle.marketplace}
        businesses={bundle.businesses}
        professionals={bundle.professionals}
        totals={totals}
        ssrOk={ssrOk}
      />
    </>
  );
}

/** Category carousels + banners below the first screen — load when scrolled near. */
export function HomepageBelowFold({
  realEstate,
  cars,
  jobs,
  marketplace,
  businesses,
  professionals,
  totals,
  ssrOk = true,
}: {
  realEstate?: PublicListingsBundle['realEstate'];
  cars?: PublicListingsBundle['cars'];
  jobs?: PublicListingsBundle['jobs'];
  marketplace?: PublicListingsBundle['marketplace'];
  businesses?: PublicListingsBundle['businesses'];
  professionals?: PublicListingsBundle['professionals'];
  totals?: PublicListingsBundle['totals'];
  ssrOk?: boolean;
}): React.JSX.Element {
  return (
    <>
      <LazyHomeSection
        verticalId="real-estate"
        initialListings={realEstate}
        initialTotal={totals?.realEstate}
        initialOk={ssrOk}
      />

      <LazyHomeSection verticalId="cars" initialListings={cars} initialTotal={totals?.cars} initialOk={ssrOk} />

      <HomepageCommunityBanner
        activeListingsCount={(totals?.realEstate ?? 0) + (totals?.cars ?? 0) + (totals?.jobs ?? 0)}
      />

      <LazyHomeSection verticalId="jobs" initialListings={jobs} initialTotal={totals?.jobs} initialOk={ssrOk} />

      <LazyHomeSection
        verticalId="marketplace"
        initialListings={marketplace}
        initialTotal={totals?.marketplace}
        initialOk={ssrOk}
      />

      <LazyHomeSection
        verticalId="businesses"
        initialListings={businesses}
        initialTotal={totals?.businesses}
        initialOk={ssrOk}
      />

      <LazyHomeSection
        verticalId="professionals"
        initialListings={professionals}
        initialTotal={totals?.professionals}
        initialOk={ssrOk}
      />

      <HomepagePostBanner />

      <SeoIntroSection />
    </>
  );
}
