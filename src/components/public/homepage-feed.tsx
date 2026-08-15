import * as React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

import { config } from '@/config';
import { homepageItemListJsonLd } from '@/lib/homepage-json-ld';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import { fetchHomepageListings } from '@/lib/public-listings-client';
import { HomepageCommunityBanner, HomepagePostBanner } from '@/components/public/homepage-community-banner';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { LazyHomeSection } from '@/components/public/lazy-home-section';
import { SeoIntroSection } from '@/components/public/seo-intro-section';

/**
 * Homepage listing carousels + JSON-LD ItemLists.
 * Fetched as one `/public/listings/latest` round-trip and streamed behind Suspense.
 */
export async function HomepageFeed(): Promise<React.JSX.Element> {
  const bundle = await fetchHomepageListings(8);
  if (!bundle.ok) {
    noStore();
  }

  const latestMixed = buildHomepageMixedLatest(bundle, 8);
  const totals = bundle.totals;
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const itemListLd = homepageItemListJsonLd(bundle, siteOrigin);

  return (
    <>
      {itemListLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <HomepageRecommendedSection fallbackItems={latestMixed} />

      <HomepageOkazionSection listings={bundle.okazion} total={bundle.okazionTotal} ssrOk={bundle.ok} />

      <LazyHomeSection
        verticalId="real-estate"
        initialListings={bundle.realEstate}
        initialTotal={totals.realEstate}
        initialOk={bundle.ok}
        eager
      />

      <LazyHomeSection
        verticalId="cars"
        initialListings={bundle.cars}
        initialTotal={totals.cars}
        initialOk={bundle.ok}
      />

      <HomepageCommunityBanner activeListingsCount={totals.realEstate + totals.cars + totals.jobs} />

      <LazyHomeSection
        verticalId="jobs"
        initialListings={bundle.jobs}
        initialTotal={totals.jobs}
        initialOk={bundle.ok}
      />

      <LazyHomeSection
        verticalId="marketplace"
        initialListings={bundle.marketplace}
        initialTotal={totals.marketplace}
        initialOk={bundle.ok}
      />

      <LazyHomeSection
        verticalId="businesses"
        initialListings={bundle.businesses}
        initialTotal={totals.businesses}
        initialOk={bundle.ok}
      />

      <LazyHomeSection
        verticalId="professionals"
        initialListings={bundle.professionals}
        initialTotal={totals.professionals}
        initialOk={bundle.ok}
      />

      <HomepagePostBanner />

      <SeoIntroSection />
    </>
  );
}
