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
import { MessagesThreadChromeProvider } from '@/contexts/messages-thread-chrome-context';
import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import { isPostListingPath } from '@/lib/post-listing-path';
import { paths } from '@/paths';

function pathMatches(pathname: string | null, base: string): boolean {
  return pathname === base || Boolean(pathname?.startsWith(`${base}/`));
}

function DashboardHeaderRow({
  showBackLink,
  backHref,
  isMessages,
}: {
  showBackLink: boolean;
  backHref: string;
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
          sx={{ mb: 0, alignSelf: 'center' }}
        />
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      {headerActions ? <Box sx={{ flexShrink: 0, ml: 'auto' }}>{headerActions}</Box> : null}
    </Stack>
  );
}

function MessageThreadSearchParams({
  isMessages,
  onUrlThreadOpen,
}: {
  isMessages: boolean;
  onUrlThreadOpen: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const open = isMessages && Boolean(searchParams.get('c'));
  React.useLayoutEffect(() => {
    onUrlThreadOpen(open);
  }, [open, onUrlThreadOpen]);
  return null;
}

export function UserDashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hostedTabs = useMainTabsHosted();
  const isDashboardHome = pathname === paths.user.dashboard;
  const isMessages = pathMatches(pathname, paths.user.messages);
  const isPackagesHub = pathname === paths.user.packages;
  const isSavedListings = pathMatches(pathname, paths.user.savedListings);
  const isPostListing = isPostListingPath(pathname);
  const showFrameClose =
    pathname === paths.user.businessesListing ||
    pathname === paths.user.professionalsListing;
  const [urlThreadOpen, setUrlThreadOpen] = React.useState(false);
  /** Optimistic override from the messages view (back / open) before URL catches up. */
  const [threadUiOpen, setThreadUiOpen] = React.useState<boolean | null>(null);
  const onUrlThreadOpen = React.useCallback((open: boolean) => {
    setUrlThreadOpen(open);
  }, []);

  React.useEffect(() => {
    setThreadUiOpen(null);
  }, [urlThreadOpen, isMessages]);

  const messageThreadOpen = threadUiOpen ?? urlThreadOpen;
  const showMobileBottomNav = !messageThreadOpen;
  const showBackLink = !isDashboardHome && !isMessages && !isSavedListings && !isPostListing;
  const backHref =
    pathMatches(pathname, paths.user.referral) && pathname !== paths.user.referral
      ? paths.user.referral
      : paths.user.dashboard;

  return (
    <AuthGuard>
      <AddListingPickerProvider>
        <OwnerEditHeaderActionsProvider>
          <MessagesThreadChromeProvider setThreadUiOpen={setThreadUiOpen}>
            <React.Suspense fallback={null}>
              <MessageThreadSearchParams isMessages={isMessages} onUrlThreadOpen={onUrlThreadOpen} />
            </React.Suspense>
            <UserDashboardFrameInner
              showMobileBottomNav={showMobileBottomNav && !hostedTabs}
              showBackLink={showBackLink}
              backHref={backHref}
              isMessages={isMessages}
              isPackagesHub={isPackagesHub}
              showFrameClose={showFrameClose}
            >
              {children}
            </UserDashboardFrameInner>
          </MessagesThreadChromeProvider>
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
  isMessages,
  isPackagesHub,
  showFrameClose,
}: {
  children: React.ReactNode;
  showMobileBottomNav: boolean;
  showBackLink: boolean;
  backHref: string;
  isMessages: boolean;
  isPackagesHub: boolean;
  showFrameClose: boolean;
}) {
  const addListingPicker = useOptionalAddListingPicker();
  const hideChromeForPicker = Boolean(addListingPicker?.addListingPickerOpen);
  const fillViewport = isMessages || isPackagesHub;

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
              minHeight: '100dvh',
              ...(isPackagesHub
                ? {
                    minHeight: '100dvh',
                    height: { xs: 'auto', md: '100dvh' },
                    overflow: { xs: 'visible', md: 'hidden' },
                  }
                : isMessages
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
                ...(isPackagesHub
                  ? { height: { xs: 'auto', md: '100%' } }
                  : isMessages
                    ? { height: { xs: '100%', md: 'auto' } }
                    : null),
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
                    flex: isPackagesHub
                      ? '1 1 auto'
                      : isMessages
                        ? { xs: '1 1 auto', md: '0 1 auto' }
                        : undefined,
                    minHeight: 0,
                    display: fillViewport ? 'flex' : undefined,
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
                    isMessages={isMessages}
                  />
                  <Box
                    sx={{
                      flex: isPackagesHub
                        ? '1 1 auto'
                        : isMessages
                          ? { xs: '1 1 auto', md: '0 1 auto' }
                          : undefined,
                      minHeight: 0,
                      display: fillViewport ? 'flex' : undefined,
                      flexDirection: 'column',
                    }}
                  >
                    {children}
                  </Box>
                </Container>
              </main>
            </Box>
            {showMobileBottomNav && !hideChromeForPicker ? <MobileBottomNav /> : null}
          </Box>
    </>
  );
}
