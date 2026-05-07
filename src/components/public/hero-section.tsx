import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';

import { HeroCategoryCircles } from './hero-category-circles';
import { HomeBannerCarousel } from './home-banner-carousel';

export interface HeroSectionProps {
  banners: HomeBannerDto[];
}

export function HeroSection({ banners }: HeroSectionProps) {
  return (
    <Box
      component="header"
      role="banner"
      aria-labelledby="hero-title"
      sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 4 } }}
    >
      <Container maxWidth="md">
        <Stack spacing={{ xs: 2.25, md: 2.75 }} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Typography
            id="hero-title"
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
            Apartamente me qira e shitje, vetura të reja dhe të përdorura, oferta pune në çdo industri,
            dhe artikuj të rinj e të dorës së dytë — të gjitha në një platformë falas.
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

          <HeroCategoryCircles variant="links" />
          <HomeBannerCarousel banners={banners} />
        </Stack>
      </Container>
    </Box>
  );
}
