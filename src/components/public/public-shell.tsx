'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { MobileBottomNav } from './mobile-bottom-nav';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';

/**
 * Wraps a public page in the marketing chrome (header + footer) so individual
 * pages can focus on their content. Used by the homepage and the four browse
 * pages.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <PublicHeader />
      <Box component="main" sx={{ flex: '1 1 auto', pb: { xs: '72px', md: 0 } }}>
        {children}
      </Box>
      <PublicFooter />
      <MobileBottomNav />
    </Box>
  );
}
