import * as React from 'react';

import { HomepageCacheSync } from '@/components/public/homepage-cache-sync';
import { HomepageBelowFold } from '@/components/public/homepage-carousels';
import { HomepageOkazionSection } from '@/components/public/homepage-okazion-section';
import { HomepageProfilesSection } from '@/components/public/homepage-profiles-section';
import { HomepageRecommendedSection } from '@/components/public/homepage-recommended-section';
import { homepageItemListJsonLd } from '@/lib/homepage-json-ld';
import { buildHomepageMixedLatest } from '@/lib/homepage-latest-listings';
import { getHomepagePublicPayload, homepagePayloadToBundle } from '@/lib/homepage-data';
import { config } from '@/config';

/**
 * Homepage listing feed from one cached public payload (banners stay on their own Suspense).
 * Avoids 4 separate SSR → API → Supabase chains per request.
 */
export async function HomepageFeed(): Promise<React.JSX.Element> {
  const payload = await getHomepagePublicPayload(8);
  const bundle = homepagePayloadToBundle(payload);
  const mixed = buildHomepageMixedLatest(bundle, 8);
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const itemListLd = bundle.ok ? homepageItemListJsonLd(bundle, siteOrigin) : [];

  return (
    <>
      {payload.ok && payload.okazion.length > 0 ? (
        <HomepageOkazionSection listings={payload.okazion} total={payload.okazionTotal} ssrOk />
      ) : !payload.ok ? (
        <HomepageOkazionSection listings={[]} total={0} ssrOk={false} />
      ) : null}

      {itemListLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}
      {bundle.ok ? <HomepageCacheSync bundle={bundle} /> : null}
      <HomepageRecommendedSection fallbackItems={mixed} ssrOk={bundle.ok} />

      <HomepageBelowFold
        realEstate={payload.realEstate}
        cars={payload.cars}
        jobs={payload.jobs}
        marketplace={payload.marketplace}
        businesses={payload.businesses}
        professionals={payload.professionals}
        totals={payload.totals}
        ssrOk={payload.ok}
      >
        <HomepageProfilesSection
          initialMembers={payload.members}
          initialTotal={payload.membersTotal}
          initialOk={payload.ok}
        />
      </HomepageBelowFold>
    </>
  );
}
