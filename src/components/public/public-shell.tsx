'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';

import { MobileBottomNav } from './mobile-bottom-nav';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';

/**
 * Wraps a public page in the marketing chrome (header + footer) so individual
 * pages can focus on their content. Used by the homepage and browse pages.
 *
 * @param hideHeaderBelowMd Use on listing **detail** routes: hides `PublicHeader` (and its layout spacer)
 *   below `md`, so hero imagery can hug the viewport top edge on phones / small tablets.
 * @param hideHeader Hide `PublicHeader` on all breakpoints (e.g. public member profile).
 * @param hideFooter Hide `PublicFooter` (e.g. focused search page).
 */
export function PublicShell({
  children,
  hideHeaderBelowMd = false,
  hideHeader = false,
  hideFooter = false,
}: {
  children: React.ReactNode;
  /** Hide fixed header below `md` (listing detail fullscreen hero). */
  hideHeaderBelowMd?: boolean;
  /** Hide fixed header on all viewports. */
  hideHeader?: boolean;
  /** Hide site footer. */
  hideFooter?: boolean;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      {hideHeader ? null : hideHeaderBelowMd ? (
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <PublicHeader />
        </Box>
      ) : (
        <PublicHeader />
      )}
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'hidden',
          pb: { xs: MOBILE_CONTENT_BOTTOM_PADDING, md: 0 },
        }}
      >
        {children}
      </Box>
      {hideFooter ? null : <PublicFooter />}
      <MobileBottomNav />
    </Box>
  );
}
