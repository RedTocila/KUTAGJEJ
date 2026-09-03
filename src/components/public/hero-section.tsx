'use client';

import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';

import { HeroCategoryCircles } from './hero-category-circles';

/**
 * Home hero — category circles paint immediately; banners stream in as `children`.
 * Explicit client boundary so Turbopack does not dual-compile this module as both
 * RSC and client (async server children like HomepageBanners stay valid via slots).
 */
export function HeroSection({ children }: { children?: React.ReactNode }) {
  return (
    <Box component="header" role="banner" aria-label="Kreu">
      <Box
        sx={{
          // Keep mobile top gap tight — toolbar already leaves space under the search bar.
          pt: { xs: 0.5, md: 3 },
          pb: 0,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
          <Stack spacing={{ xs: 1.5, md: 3 }} sx={{ alignItems: 'stretch', width: '100%' }}>
            <HeroCategoryCircles variant="links" includeAi={false} />
            {children}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
