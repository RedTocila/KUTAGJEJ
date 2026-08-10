import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';

import type { HomeDesktopHeroStats } from './home-desktop-hero';
import { HeroCategoryCircles } from './hero-category-circles';
import { HomeBannerCarousel } from './home-banner-carousel';

export interface HeroSectionProps {
  banners: HomeBannerDto[];
  /** @deprecated Unused — kept so callers can keep passing homepage counts. */
  stats?: HomeDesktopHeroStats;
}

/**
 * Home hero — same composition on mobile and desktop:
 * category circles, then the promo banner carousel (no competing headline overlay).
 */
export function HeroSection({ banners }: HeroSectionProps) {
  return (
    <Box component="header" role="banner" aria-label="Kreu">
      <Box
        sx={{
          pt: { xs: 1.5, md: 3 },
          pb: { xs: 3, md: 3.5 },
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
          <Stack spacing={{ xs: 2.25, md: 3 }} sx={{ alignItems: 'stretch', width: '100%' }}>
            <HeroCategoryCircles variant="links" includeAi={false} />
            <HomeBannerCarousel banners={banners} />
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
