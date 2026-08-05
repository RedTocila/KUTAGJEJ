'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { usePopover } from '@/hooks/use-popover';

import { paths } from '@/paths';
import type { AppMessages } from '@/lib/i18n/messages';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { useOptionalAddListingPicker } from '@/components/user/add-listing-picker-context';
import { HeaderLanguageToggle } from '@/components/user/header-language-toggle';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';

import { UserMobileNav } from './user-mobile-nav';
import { UserPortalPopover } from './user-portal-popover';

function titleForPath(pathname: string, t: AppMessages): string {
  if (pathname.startsWith(paths.user.profile)) return t.nav.profile;
  if (pathname.startsWith(paths.user.messages)) return t.nav.messages;
  if (pathname.startsWith(paths.user.savedListings)) return t.nav.saved;
  if (pathname.startsWith(paths.user.myRealEstateListings)) return t.nav.myListings;
  if (pathname.startsWith(paths.user.statistics)) return t.nav.statistics;
  if (pathname.startsWith(paths.user.referral)) return t.nav.referral;
  if (pathname.startsWith(paths.user.packagesMain)) return t.nav.packagesMain;
  if (pathname.startsWith(paths.user.packagesExtra)) return t.nav.packagesExtra;
  if (pathname.startsWith(paths.user.packagesCredits)) return t.nav.buyBoostCoins;
  if (pathname.startsWith(paths.user.packages)) return t.nav.packages;
  if (pathname.startsWith(paths.user.credits)) return t.nav.buyCredits;
  if (pathname.startsWith(paths.user.checkout)) return t.nav.checkout;
  if (pathname.startsWith(paths.user.payments)) return t.nav.payments;
  if (pathname.startsWith(paths.user.realEstateListing)) return t.nav.postListing;
  if (pathname === paths.user.dashboard) return t.nav.overview;
  return t.nav.panel;
}

export function UserMainNav() {
  const pathname = usePathname();
  const [openNav, setOpenNav] = React.useState(false);
  const userPopover = usePopover<HTMLDivElement>();
  const { user } = useUser();
  const t = useCopy();
  const addListingPicker = useOptionalAddListingPicker();

  const title = titleForPath(pathname, t);
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();
  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');
  const onPostFlow = pathname.startsWith(paths.user.realEstateListing);

  return (
    <Box>
      <Box
        component="header"
        sx={{
          borderBottom: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--mui-zIndex-appBar)',
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '56px', px: 2 }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <IconButton
              onClick={() => setOpenNav(true)}
              sx={{ display: { lg: 'none' } }}
              aria-label={t.common.openMenu}
            >
              {React.createElement(ListIcon, { size: 24 })}
            </IconButton>
            <Typography
              variant="h6"
              component="span"
              sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {canPublish && !onPostFlow ? (
              <Tooltip title={t.common.addListing}>
                <IconButton
                  aria-label={t.common.addListing}
                  onClick={() => addListingPicker?.openAddListingPicker()}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' },
                  }}
                >
                  <PlusIcon size={18} weight="bold" />
                </IconButton>
              </Tooltip>
            ) : null}
            <HeaderLanguageToggle />
            <ThemeModeToggle />
            <Tooltip title={t.common.myAccount}>
              <Avatar
                onClick={userPopover.handleOpen}
                ref={userPopover.anchorRef}
                sx={{ cursor: 'pointer', bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}
              >
                {initial}
              </Avatar>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
      <UserPortalPopover
        anchorEl={userPopover.anchorEl}
        onClose={userPopover.handleClose}
        open={userPopover.open}
        email={user?.email}
      />
      <UserMobileNav
        open={openNav}
        onClose={() => {
          setOpenNav(false);
        }}
      />
    </Box>
  );
}
