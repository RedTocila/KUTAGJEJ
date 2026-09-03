'use client';

import * as React from 'react';

import { HeroSection } from '@/components/public/hero-section';
import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { PublicHeader } from '@/components/public/public-header';

/**
 * Offscreen Home pane while other tabs are open.
 * Paints from session cache and refreshes client-side so a stalled soft-nav
 * back to `/` cannot leave the tab on empty skeletons forever.
 */
export function MainTabsHomePreview() {
  return (
    <>
      <PublicHeader />
      <HeroSection />
      <HomeCarouselsFallback refresh />
    </>
  );
}
