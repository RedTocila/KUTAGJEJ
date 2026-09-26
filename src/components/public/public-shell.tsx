'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { isNativeApp } from '@/lib/native-app';

import { MobileBottomNav } from './mobile-bottom-nav';
import { PublicFooter } from './public-footer';
import { PublicHeader } from './public-header';

/**
 * Wraps a public page in the marketing chrome (header + footer) so individual
 * pages can focus on their content.
 *
 * Desktop: header only when `keepDesktopHeader` (homepage). Other routes omit it.
 * Mobile: header unless `hideHeader` / `hideHeaderBelowMd`.
 *
 * Bottom padding lives on the outer shell (not `main`) so the footer clears the
 * floating nav as well as page content.
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
  const showMobileNav = !hideMobileNav && !hostedTabs;
  /** Hosted tabs still show the floating nav from MainTabsShell — keep clearance. */
  const clearFloatingNav = !hideMobileNav;
  const [nativeApp, setNativeApp] = React.useState(false);

  React.useEffect(() => {
    if (isNativeApp()) setNativeApp(true);
  }, []);

  const showFooter = !hideFooter && !nativeApp;

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
        pb: clearFloatingNav ? { xs: MOBILE_CONTENT_BOTTOM_PADDING, md: 0 } : 0,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'clip',
        }}
      >
        {header}
        <Box className={hostedTabs ? undefined : 'kutagjej-fade'}>{children}</Box>
      </Box>
      {showFooter ? <PublicFooter /> : null}
      {showMobileNav ? <MobileBottomNav /> : null}
    </Box>
  );
}
