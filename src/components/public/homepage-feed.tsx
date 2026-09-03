import * as React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

import { HomepageCacheSync } from '@/components/public/homepage-cache-sync';
import { HomepageBelowFold } from '@/components/public/homepage-carousels';
import { HomeOkazionFallback, HomeRecommendedFallback } from '@/components/public/home-carousels-fallback';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageProfilesSection } from '@/components/public/homepage-profiles-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { homepageItemListJsonLd } from '@/lib/homepage-json-ld';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import { fetchLatestPublicMembers } from '@/lib/public-member-client';
import { fetchBrowseOkazion, fetchHomepageRecommended } from '@/lib/public-listings-client';
import { config } from '@/config';

/**
 * Priority homepage: OKAZION streams first, recommended next, category rows on scroll.
 */
export function HomepageFeed(): React.JSX.Element {
  return (
    <>
      <React.Suspense fallback={<HomeOkazionFallback />}>
        <HomepageOkazionFeed />
      </React.Suspense>
      <React.Suspense fallback={<HomeRecommendedFallback />}>
        <HomepageRecommendedFeed />
      </React.Suspense>
      <HomepageBelowFold>
        <React.Suspense fallback={<HomepageProfilesSection initialOk={false} />}>
          <HomepageProfilesFeed />
        </React.Suspense>
      </HomepageBelowFold>
    </>
  );
}

async function HomepageRecommendedFeed(): Promise<React.JSX.Element> {
  const bundle = await fetchHomepageRecommended(8);
  if (!bundle.ok) {
    noStore();
  }

  const mixed = buildHomepageMixedLatest(bundle, 8);
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const itemListLd = bundle.ok ? homepageItemListJsonLd(bundle, siteOrigin) : [];

  return (
    <>
      {itemListLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      {bundle.ok ? <HomepageCacheSync bundle={bundle} /> : null}
      <HomepageRecommendedSection fallbackItems={mixed} ssrOk={bundle.ok} />
    </>
  );
}

async function HomepageProfilesFeed(): Promise<React.JSX.Element> {
  const res = await fetchLatestPublicMembers(8);
  if (!res.ok) {
    noStore();
  }
  return (
    <HomepageProfilesSection
      initialMembers={res.members}
      initialTotal={res.total}
      initialOk={res.ok}
    />
  );
}

async function HomepageOkazionFeed(): Promise<React.JSX.Element | null> {
  const res = await fetchBrowseOkazion(8);
  if (!res.ok) {
    noStore();
    return <HomepageOkazionSection listings={[]} total={0} ssrOk={false} />;
  }
  if (res.listings.length === 0) return null;
  return <HomepageOkazionSection listings={res.listings} total={res.total} ssrOk />;
}
