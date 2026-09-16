'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Box, Button, IconButton, Stack, Tooltip } from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { usePopover } from '@/hooks/use-popover';

import { paths } from '@/paths';
import { BrandLogo } from '@/components/brand/brand-logo';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { HeaderSearchBar } from '@/components/public/header-mobile-search';
import { useOptionalAddListingPicker } from '@/components/user/add-listing-picker-context';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { isPostListingPath } from '@/lib/post-listing-path';

import { UserMobileNav } from './user-mobile-nav';
import { UserPortalPopover } from './user-portal-popover';

/**
 * Dashboard top bar — same chrome as the old public header:
 * logo, search, theme, profile, post. Only used inside the user dashboard.
 */
export function UserMainNav() {
  const pathname = usePathname();
  const [openNav, setOpenNav] = React.useState(false);
  const userPopover = usePopover<HTMLDivElement>();
  const { user } = useUser();
  const t = useCopy();
  const addListingPicker = useOptionalAddListingPicker();

  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();
  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');
  const onPostFlow = isPostListingPath(pathname);
  const showPost = canPublish && !onPostFlow;

  const openPost = () => {
    addListingPicker?.openAddListingPicker();
  };

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
          spacing={{ xs: 1, md: 1.5 }}
          sx={{
            alignItems: 'center',
            minHeight: { xs: 64, md: 72 },
            px: { xs: 1.5, md: 2 },
          }}
        >
          <IconButton
            onClick={() => setOpenNav(true)}
            sx={{ display: { lg: 'none' }, flexShrink: 0 }}
            aria-label={t.common.openMenu}
          >
            {React.createElement(ListIcon, { size: 24 })}
          </IconButton>

          <Box
            component={RouterLink}
            href={paths.home}
            aria-label={t.chrome.homeAria}
            sx={{
              display: 'inline-flex',
              textDecoration: 'none',
              color: 'inherit',
              flexShrink: 0,
            }}
          >
            <BrandLogo
              height={44}
              showWordmark
              wordmarkPresentation="brand"
              wordmarkLayout="stacked"
              imgSx={{ height: { xs: 40, md: 48 }, width: 'auto' }}
              wordmarkSx={{
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                lineHeight: 1.02,
                letterSpacing: '-0.05em',
              }}
            />
          </Box>

          <HeaderSearchBar allBreakpoints />

          <Stack direction="row" spacing={{ xs: 0.75, md: 1.25 }} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <ThemeModeToggle iconSize={22} />
            </Box>
            <Tooltip title={t.common.myAccount}>
              <Avatar
                onClick={userPopover.handleOpen}
                ref={userPopover.anchorRef}
                sx={{
                  cursor: 'pointer',
                  width: { xs: 36, md: 40 },
                  height: { xs: 36, md: 40 },
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                  fontSize: { xs: '0.85rem', md: '1rem' },
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>
            {showPost ? (
              <>
                <Button
                  onClick={openPost}
                  variant="contained"
                  size="large"
                  startIcon={React.createElement(PlusIcon, { size: 20, weight: 'bold' })}
                  sx={{
                    display: { xs: 'none', md: 'inline-flex' },
                    borderRadius: 2.25,
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1.1,
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.common.postFree}
                </Button>
                <Tooltip title={t.common.postListing}>
                  <IconButton
                    onClick={openPost}
                    aria-label={t.common.postListing}
                    sx={{
                      display: { xs: 'inline-flex', md: 'none' },
                      width: 40,
                      height: 40,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' },
                    }}
                  >
                    {React.createElement(PlusIcon, { size: 18, weight: 'bold' })}
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
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
