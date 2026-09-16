'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';

import { MobileBottomNav } from './mobile-bottom-nav';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';

/**
 * Wraps a public page in the marketing chrome (header + footer) so individual
 * pages can focus on their content.
 *
 * Desktop: header only when `keepDesktopHeader` (homepage). Other routes omit it.
 * Mobile: header unless `hideHeader` / `hideHeaderBelowMd`.
 */
export function PublicShell({
  children,
  hideHeaderBelowMd = false,
  hideHeader = false,
  keepDesktopHeader = false,
  hideFooter = false,
  hideMobileNav = false,
}: {
  children: React.ReactNode;
  /** Hide header on mobile (browse / listing detail heroes). Desktop stays hidden unless homepage. */
  hideHeaderBelowMd?: boolean;
  /** Hide header on all viewports. */
  hideHeader?: boolean;
  /** Show header on desktop too — homepage only. */
  keepDesktopHeader?: boolean;
  /** Hide site footer. */
  hideFooter?: boolean;
  /** Hide floating bottom nav — used when the page renders its own bottom chrome. */
  hideMobileNav?: boolean;
}) {
  const hostedTabs = useMainTabsHosted();

  let header: React.ReactNode = null;
  if (hideHeader || hideHeaderBelowMd) {
    header = null;
  } else if (keepDesktopHeader) {
    header = <PublicHeader />;
  } else {
    header = (
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <PublicHeader />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'clip',
      }}
    >
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'clip',
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
