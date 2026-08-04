'use client';

import * as React from 'react';

import { HomepageBanner } from '@/components/public/homepage-banner';
import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';

export function HomepageCommunityBanner({
  activeListingsCount,
}: {
  activeListingsCount: number;
}) {
  const t = useCopy();

  return (
    <HomepageBanner
      variant="secondary"
      eyebrow={t.home.communityEyebrow}
      title={t.home.communityTitle}
      subtitle={t.home.communitySubtitle}
      primaryAction={{ label: t.home.exploreListings, href: paths.public.realEstate }}
      secondaryAction={{ label: t.common.postFree, href: paths.user.realEstateListing }}
      stats={[
        {
          value: activeListingsCount,
          suffix: '+',
          label: t.home.activeListings,
        },
        { value: 6, label: t.home.mainCategories },
        { value: 12, suffix: '+', label: t.home.citiesCovered },
      ]}
    />
  );
}

export function HomepagePostBanner() {
  const t = useCopy();

  return (
    <HomepageBanner
      variant="primary"
      eyebrow={t.home.postEyebrow}
      title={t.home.postTitle}
      subtitle={t.home.postSubtitle}
      primaryAction={{ label: t.home.postCta, href: paths.user.realEstateListing }}
      secondaryAction={{ label: t.home.howItWorks, href: paths.public.about }}
      features={[
        { iconKey: 'currency-eur', label: t.home.featureFree },
        { iconKey: 'lightning', label: t.home.featureFast },
        { iconKey: 'shield-check', label: t.home.featureNoFees },
      ]}
    />
  );
}
