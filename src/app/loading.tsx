import * as React from 'react';

import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { HeroSection } from '@/components/public/hero-section';
import { HomeBannerSkeleton } from '@/components/public/homepage-skeletons';
import { PublicShell } from '@/components/public/public-shell';

/** Instant placeholder when soft-navigating to `/`. */
export default function Loading(): React.JSX.Element {
  return (
    <PublicShell>
      <HeroSection>
        <HomeBannerSkeleton />
      </HeroSection>
      <HomeCarouselsFallback />
    </PublicShell>
  );
}
