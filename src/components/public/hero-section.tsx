import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';

import { HomeCategoriesStrip } from './home-categories-strip';
import { HomeDesktopHero, type HomeDesktopHeroStats } from './home-desktop-hero';
import { HeroCategoryCircles } from './hero-category-circles';
import { HomeBannerCarousel } from './home-banner-carousel';

export interface HeroSectionProps {
  banners: HomeBannerDto[];
  stats: HomeDesktopHeroStats;
}

export function HeroSection({ banners, stats }: HeroSectionProps) {
  return (
    <Box component="header" role="banner" aria-labelledby="home-hero-heading">
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <HomeDesktopHero banners={banners} stats={stats} />
        <HomeCategoriesStrip />
      </Box>

      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          mt: { xs: -8, md: 0 },
          pt: { xs: 10, md: 6 },
          pb: { xs: 3, md: 4 },
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={{ xs: 2.25, md: 2.75 }} sx={{ alignItems: { xs: 'stretch', md: 'center' }, textAlign: 'center' }}>
            <Typography
              id="home-hero-heading"
              component="h1"
              sx={{
                display: 'none',
                fontWeight: 800,
                fontSize: { xs: '1.6rem', sm: '1.9rem', md: '2.4rem' },
                lineHeight: { xs: 1.2, md: 1.15 },
                letterSpacing: '-0.02em',
                color: 'text.primary',
                maxWidth: 720,
              }}
            >
              Njoftimet e Shqipërisë në një vend — pasuri, automjete, punë dhe tregu
            </Typography>

            <Typography
              component="p"
              color="text.secondary"
              sx={{
                display: 'none',
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                fontWeight: 500,
                lineHeight: 1.55,
                maxWidth: 620,
              }}
            >
              Apartamente me qira e shitje, vetura të reja dhe të përdorura, oferta pune në çdo industri, dhe
              artikuj të rinj e të dorës së dytë — të gjitha në një platformë falas.
            </Typography>

            <Typography
              component="p"
              color="text.disabled"
              sx={{
                display: 'none',
                fontSize: { xs: '0.85rem', md: '0.9rem' },
                fontWeight: 500,
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              kërko shpejt, dhe gjej saktësisht atë që do.
            </Typography>

            <HeroCategoryCircles variant="links" includeAi={false} />
            <HomeBannerCarousel banners={banners} />
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
