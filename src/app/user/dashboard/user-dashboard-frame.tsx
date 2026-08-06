'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Box, Container, GlobalStyles, Stack } from '@mui/material';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MobileBottomNav } from '@/components/public/mobile-bottom-nav';
import { AddListingPickerProvider, useOptionalAddListingPicker } from '@/components/user/add-listing-picker-context';
import {
  UserDashboardBackLink,
  UserDashboardCloseButton,
} from '@/components/user/layout/user-dashboard-back-link';
import { UserSideNav } from '@/components/user/layout/user-side-nav';
import {
  OwnerEditHeaderActionsProvider,
  useOwnerEditHeaderActionsSlot,
} from '@/components/user/owner-edit-header-actions';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { isPostListingPath } from '@/lib/post-listing-path';
import { paths } from '@/paths';

function pathMatches(pathname: string | null, base: string): boolean {
  return pathname === base || Boolean(pathname?.startsWith(`${base}/`));
}

function DashboardHeaderRow({
  showBackLink,
  backHref,
  backLabel,
  isMessages,
}: {
  showBackLink: boolean;
  backHref: string;
  backLabel: string;
  isMessages: boolean;
}) {
  const headerActions = useOwnerEditHeaderActionsSlot();
  if (!showBackLink && !headerActions) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mb: isMessages ? { xs: 1.5, md: 2 } : 2,
        px: isMessages ? { xs: 2, md: 0 } : 0,
        pt: isMessages ? { xs: 1.5, md: 0 } : 0,
        minHeight: 36,
      }}
    >
      {showBackLink ? (
        <UserDashboardBackLink
          href={backHref}
          label={backLabel}
          sx={{ mb: 0, alignSelf: 'center' }}
        />
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      {headerActions ? <Box sx={{ flexShrink: 0, ml: 'auto' }}>{headerActions}</Box> : null}
    </Stack>
  );
}

export function UserDashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDashboardHome = pathname === paths.user.dashboard;
  const isMessages = pathMatches(pathname, paths.user.messages);
  const isSavedListings = pathMatches(pathname, paths.user.savedListings);
  const isPostListing = isPostListingPath(pathname);
  const showFrameClose =
    pathname === paths.user.businessesListing ||
    pathname === paths.user.professionalsListing;
  const messageThreadOpen = isMessages && Boolean(searchParams.get('c'));
  const showMobileBottomNav = !messageThreadOpen;
  const showBackLink = !isDashboardHome && !isMessages && !isSavedListings && !isPostListing;
  const backHref = paths.user.dashboard;
  const backLabel = 'Kthehu te profili';

  return (
    <AuthGuard>
      <AddListingPickerProvider>
        <OwnerEditHeaderActionsProvider>
          <UserDashboardFrameInner
            showMobileBottomNav={showMobileBottomNav}
            showBackLink={showBackLink}
            backHref={backHref}
            backLabel={backLabel}
            isMessages={isMessages}
            showFrameClose={showFrameClose}
          >
            {children}
          </UserDashboardFrameInner>
        </OwnerEditHeaderActionsProvider>
      </AddListingPickerProvider>
    </AuthGuard>
  );
}

function UserDashboardFrameInner({
  children,
  showMobileBottomNav,
  showBackLink,
  backHref,
  backLabel,
  isMessages,
  showFrameClose,
}: {
  children: React.ReactNode;
  showMobileBottomNav: boolean;
  showBackLink: boolean;
  backHref: string;
  backLabel: string;
  isMessages: boolean;
  showFrameClose: boolean;
}) {
  const addListingPicker = useOptionalAddListingPicker();
  const hideChromeForPicker = Boolean(addListingPicker?.addListingPickerOpen);

  return (
    <>
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
              ...(hideChromeForPicker ? { pointerEvents: 'none', userSelect: 'none' } : null),
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
                      ? {
                          xs: MOBILE_CONTENT_BOTTOM_PADDING,
                          md: MOBILE_CONTENT_BOTTOM_PADDING,
                          lg: 4,
                        }
                      : { md: isMessages ? 4 : undefined },
                  }}
                >
                  {showFrameClose ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, mb: 1 }}>
                      <UserDashboardCloseButton href={paths.home} />
                    </Box>
                  ) : null}
                  <DashboardHeaderRow
                    showBackLink={showBackLink}
                    backHref={backHref}
                    backLabel={backLabel}
                    isMessages={isMessages}
                  />
                  {children}
                </Container>
              </main>
            </Box>
            {showMobileBottomNav && !hideChromeForPicker ? <MobileBottomNav /> : null}
          </Box>
    </>
  );
}
