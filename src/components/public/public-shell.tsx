'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';

import { MobileBottomNav } from './mobile-bottom-nav';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';
import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';

/**
 * Wraps a public page in the marketing chrome (header + footer) so individual
 * pages can focus on their content. Used by the homepage and browse pages.
 *
 * @param hideHeaderBelowMd Use on listing **detail** routes: hides `PublicHeader`
 *   below `md`, so hero imagery can hug the viewport top edge on phones / small tablets.
 * @param hideHeader Hide `PublicHeader` on all breakpoints (e.g. public member profile).
 * @param hideFooter Hide `PublicFooter` (e.g. focused search page).
 * @param hideMobileNav Hide the floating bottom nav (search page replaces it with its own dock).
 */
export function PublicShell({
  children,
  hideHeaderBelowMd = false,
  hideHeader = false,
  hideFooter = false,
  hideMobileNav = false,
}: {
  children: React.ReactNode;
  /** Hide header below `md` (listing detail fullscreen hero). */
  hideHeaderBelowMd?: boolean;
  /** Hide header on all viewports. */
  hideHeader?: boolean;
  /** Hide site footer. */
  hideFooter?: boolean;
  /** Hide floating bottom nav — used when the page renders its own bottom chrome. */
  hideMobileNav?: boolean;
}) {
  const hostedTabs = useMainTabsHosted();
  const header = hideHeader ? null : hideHeaderBelowMd ? (
    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
      <PublicHeader />
    </Box>
  ) : (
    <PublicHeader />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: '100%',
          pb: hideMobileNav ? 0 : { xs: MOBILE_CONTENT_BOTTOM_PADDING, md: 0 },
        }}
      >
        {header}
        <Box className={hostedTabs ? undefined : 'kutagjej-fade'}>{children}</Box>
      </Box>
      {hideFooter ? null : <PublicFooter />}
      {hideMobileNav || hostedTabs ? null : <MobileBottomNav />}
    </Box>
  );
}
