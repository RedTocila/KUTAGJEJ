'use client';

import * as React from 'react';

import { HeroSection } from '@/components/public/hero-section';
import { HomeCarouselsFallback } from '@/components/public/home-carousels-fallback';
import { PublicHeader } from '@/components/public/public-header';

/** Offscreen Home pane while other tabs are open — paints from the homepage session cache. */
export function MainTabsHomePreview() {
  return (
    <>
      <PublicHeader />
      <HeroSection />
      <HomeCarouselsFallback />
    </>
  );
}
