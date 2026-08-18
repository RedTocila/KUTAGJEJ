'use client';

import * as React from 'react';

import { HomepageBanner } from '@/components/public/homepage-banner';
import { HowItWorksTutorial } from '@/components/public/how-it-works-tutorial';
import { useCopy } from '@/hooks/use-copy';
import { getHomepageListingsCacheSnapshot } from '@/lib/homepage-session-cache';
import { paths } from '@/paths';

export function HomepageCommunityBanner({
  activeListingsCount = 0,
}: {
  activeListingsCount?: number;
}) {
  const t = useCopy();
  const cached = getHomepageListingsCacheSnapshot();
  const fromCache = cached
    ? cached.totals.realEstate + cached.totals.cars + cached.totals.jobs
    : 0;
  const count = activeListingsCount > 0 ? activeListingsCount : fromCache;
  const stats =
    count > 0
      ? [
          {
            value: count,
            suffix: '+',
            label: t.home.activeListings,
          },
          { value: 6, label: t.home.mainCategories },
          { value: 12, suffix: '+', label: t.home.citiesCovered },
        ]
      : [
          { value: 6, label: t.home.mainCategories },
          { value: 12, suffix: '+', label: t.home.citiesCovered },
        ];

  return (
    <HomepageBanner
      variant="secondary"
      eyebrow={t.home.communityEyebrow}
      title={t.home.communityTitle}
      subtitle={t.home.communitySubtitle}
      primaryAction={{ label: t.home.exploreListings, href: paths.public.realEstate }}
      secondaryAction={{ label: t.common.postFree, href: paths.user.realEstateListing }}
      stats={stats}
    />
  );
}

export function HomepagePostBanner() {
  const t = useCopy();
  const [tutorialOpen, setTutorialOpen] = React.useState(false);

  return (
    <>
      <HomepageBanner
        variant="primary"
        eyebrow={t.home.postEyebrow}
        title={t.home.postTitle}
        subtitle={t.home.postSubtitle}
        primaryAction={{ label: t.home.postCta, href: paths.user.realEstateListing }}
        secondaryAction={{
          label: t.home.howItWorks,
          onClick: () => setTutorialOpen(true),
        }}
        features={[
          { iconKey: 'currency-eur', label: t.home.featureFree },
          { iconKey: 'lightning', label: t.home.featureFast },
          { iconKey: 'shield-check', label: t.home.featureNoFees },
        ]}
      />
      <HowItWorksTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </>
  );
}
