import * as React from 'react';
import { Box, Container, Stack } from '@mui/material';

import { HeroCategoryCircles } from './hero-category-circles';

/**
 * Home hero — category circles paint immediately; banners stream in as `children`.
 */
export function HeroSection({ children }: { children?: React.ReactNode }) {
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
            {children}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
