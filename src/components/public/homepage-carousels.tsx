'use client';

import * as React from 'react';

import { HomepageCommunityBanner, HomepagePostBanner } from '@/components/public/homepage-community-banner';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageProfilesSection } from '@/components/public/homepage-profiles-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { HomeFeedSeoInterlude } from '@/components/public/home-feed-seo-interlude';
import { LazyHomeSection } from '@/components/public/lazy-home-section';
import { SeoIntroSection } from '@/components/public/seo-intro-section';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import { HOME_FEED_SEO_INTERLUDES } from '@/lib/public-seo-copy';
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
  const [okazionRec, pronaMakina, puneTregu, bizPro] = HOME_FEED_SEO_INTERLUDES;

  return (
    <>
      <HomepageOkazionSection listings={bundle.okazion} total={bundle.okazionTotal} ssrOk={ssrOk} />

      <HomepageRecommendedSection fallbackItems={latestMixed} ssrOk={ssrOk} />

      <HomeFeedSeoInterlude titleId={okazionRec.id} title={okazionRec.title} text={okazionRec.text} />

      <HomepageBelowFold
        realEstate={bundle.realEstate}
        cars={bundle.cars}
        jobs={bundle.jobs}
        marketplace={bundle.marketplace}
        businesses={bundle.businesses}
        professionals={bundle.professionals}
        totals={totals}
        ssrOk={ssrOk}
        interludes={{ pronaMakina, puneTregu, bizPro }}
      />
    </>
  );
}

type FeedInterlude = (typeof HOME_FEED_SEO_INTERLUDES)[number];

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
  children,
  interludes,
}: {
  realEstate?: PublicListingsBundle['realEstate'];
  cars?: PublicListingsBundle['cars'];
  jobs?: PublicListingsBundle['jobs'];
  marketplace?: PublicListingsBundle['marketplace'];
  businesses?: PublicListingsBundle['businesses'];
  professionals?: PublicListingsBundle['professionals'];
  totals?: PublicListingsBundle['totals'];
  ssrOk?: boolean;
  /** Server-streamed profiles row; omit to render client `HomepageProfilesSection`. */
  children?: React.ReactNode;
  interludes?: {
    pronaMakina: FeedInterlude;
    puneTregu: FeedInterlude;
    bizPro: FeedInterlude;
  };
}): React.JSX.Element {
  const pronaMakina = interludes?.pronaMakina ?? HOME_FEED_SEO_INTERLUDES[1];
  const puneTregu = interludes?.puneTregu ?? HOME_FEED_SEO_INTERLUDES[2];
  const bizPro = interludes?.bizPro ?? HOME_FEED_SEO_INTERLUDES[3];

  return (
    <>
      <LazyHomeSection
        verticalId="real-estate"
        initialListings={realEstate}
        initialTotal={totals?.realEstate}
        initialOk={ssrOk}
      />

      <LazyHomeSection verticalId="cars" initialListings={cars} initialTotal={totals?.cars} initialOk={ssrOk} />

      <HomeFeedSeoInterlude titleId={pronaMakina.id} title={pronaMakina.title} text={pronaMakina.text} />

      <HomepageCommunityBanner
        activeListingsCount={
          (totals?.realEstate ?? 0) +
          (totals?.cars ?? 0) +
          (totals?.jobs ?? 0) +
          (totals?.marketplace ?? 0) +
          (totals?.businesses ?? 0) +
          (totals?.professionals ?? 0)
        }
      />

      <LazyHomeSection verticalId="jobs" initialListings={jobs} initialTotal={totals?.jobs} initialOk={ssrOk} />

      <LazyHomeSection
        verticalId="marketplace"
        initialListings={marketplace}
        initialTotal={totals?.marketplace}
        initialOk={ssrOk}
      />

      <HomeFeedSeoInterlude titleId={puneTregu.id} title={puneTregu.title} text={puneTregu.text} />

      {children ?? <HomepageProfilesSection />}

      <HomepagePostBanner />

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

      <HomeFeedSeoInterlude titleId={bizPro.id} title={bizPro.title} text={bizPro.text} />

      <SeoIntroSection />
    </>
  );
}
