import * as React from 'react';
import { unstable_noStore as noStore } from 'next/cache';

import { HomepageCacheSync } from '@/components/public/homepage-cache-sync';
import { HomepageCarousels } from '@/components/public/homepage-carousels';
import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { homepageItemListJsonLd } from '@/lib/homepage-json-ld';
import { homepageBundleHasListings } from '@/lib/homepage-session-cache';
import { fetchHomepageListings } from '@/lib/public-listings-client';
import { config } from '@/config';

/**
 * Homepage listing carousels + JSON-LD ItemLists.
 * Fetched as one `/public/listings/latest` round-trip and streamed behind Suspense.
 */
export async function HomepageFeed(): Promise<React.JSX.Element> {
  const bundle = await fetchHomepageListings(8);
  if (!bundle.ok) {
    noStore();
  }

  if (!bundle.ok && !homepageBundleHasListings(bundle)) {
    return <HomeCarouselsFallback refresh />;
  }

  const siteOrigin = config.site.url.replace(/\/$/, '');
  const itemListLd = homepageItemListJsonLd(bundle, siteOrigin);

  return (
    <>
      {itemListLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      <HomepageCacheSync bundle={bundle} />
      <HomepageCarousels bundle={bundle} ssrOk={bundle.ok} />
    </>
  );
}
