import * as React from 'react';

import { HeroSection } from '@/components/public/hero-section';
import { HomeBannerSkeleton, HomeCarouselsSkeleton } from '@/components/public/homepage-skeletons';
import { PublicShell } from '@/components/public/public-shell';

/** Instant placeholder when soft-navigating to `/`. */
export default function Loading(): React.JSX.Element {
  return (
    <PublicShell>
      <HeroSection>
        <HomeBannerSkeleton />
      </HeroSection>
      <HomeCarouselsSkeleton />
    </PublicShell>
  );
}
