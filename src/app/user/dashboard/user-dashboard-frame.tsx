'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Box, Container, GlobalStyles } from '@mui/material';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MobileBottomNav } from '@/components/public/mobile-bottom-nav';
import { UserDashboardBackLink } from '@/components/user/layout/user-dashboard-back-link';
import { UserSideNav } from '@/components/user/layout/user-side-nav';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { paths } from '@/paths';

function pathMatches(pathname: string | null, base: string): boolean {
  return pathname === base || Boolean(pathname?.startsWith(`${base}/`));
}

export function UserDashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDashboardHome = pathname === paths.user.dashboard;
  const isMessages = pathMatches(pathname, paths.user.messages);
  const isPackagesSub =
    pathMatches(pathname, paths.user.packages) && pathname !== paths.user.packages;
  const messageThreadOpen = isMessages && Boolean(searchParams.get('c'));
  const showMobileBottomNav = !messageThreadOpen;
  const showBackToDashboard = !isDashboardHome && !messageThreadOpen;

  return (
    <AuthGuard>
      <GlobalStyles
        styles={{
          body: {
            '--MainNav-height': '56px',
            '--MainNav-zIndex': 1000,
            '--SideNav-width': '280px',
            '--SideNav-zIndex': 1100,
            '--MobileNav-width': '320px',
            '--MobileNav-zIndex': 1100,
          },
        }}
      />
      <Box
        sx={{
          bgcolor: 'var(--mui-palette-background-default)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
          ...(isMessages
            ? {
                height: { xs: '100dvh', md: 'auto' },
                overflow: { xs: 'hidden', md: 'visible' },
              }
            : null),
        }}
      >
        <UserSideNav />
        <Box
          sx={{
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            pl: { lg: 'var(--SideNav-width)' },
            minHeight: 0,
            ...(isMessages ? { height: { xs: '100%', md: 'auto' } } : null),
          }}
        >
          <main
            style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}
          >
            <Container
              maxWidth="xl"
              disableGutters={isMessages}
              sx={{
                py: isMessages ? { xs: 0, md: 4 } : { xs: 3, md: 4 },
                px: isMessages ? { xs: 0, md: 3 } : undefined,
                flex: isMessages ? { xs: '1 1 auto', md: '0 1 auto' } : undefined,
                minHeight: 0,
                display: isMessages ? 'flex' : undefined,
                flexDirection: 'column',
                pb: showMobileBottomNav
                  ? { xs: MOBILE_CONTENT_BOTTOM_PADDING, md: MOBILE_CONTENT_BOTTOM_PADDING, lg: 4 }
                  : { md: isMessages ? 4 : undefined },
              }}
            >
              {showBackToDashboard ? (
                <UserDashboardBackLink
                  href={isPackagesSub ? paths.user.packages : undefined}
                  label={isPackagesSub ? 'Kthehu te paketat' : undefined}
                  sx={{
                    flexShrink: 0,
                    mb: isMessages ? { xs: 1.5, md: 2 } : 2,
                    px: isMessages ? { xs: 2, md: 0 } : 0,
                    pt: isMessages ? { xs: 1.5, md: 0 } : 0,
                  }}
                />
              ) : null}
              {children}
            </Container>
          </main>
        </Box>
        {showMobileBottomNav ? <MobileBottomNav /> : null}
      </Box>
    </AuthGuard>
  );
}
