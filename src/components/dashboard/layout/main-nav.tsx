'use client';

import * as React from 'react';
import { Avatar, Box, IconButton, Stack, Tooltip } from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { usePopover } from '@/hooks/use-popover';

import { AdminNavSearch } from './admin-nav-search';
import { MobileNav } from './mobile-nav';
import { ThemeModeToggle } from './theme-mode-toggle';
import { UserPopover } from './user-popover';
import { AdminNotificationsMenu } from './admin-notifications-menu';

export function MainNav() {
  const [openNav, setOpenNav] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const userPopover = usePopover<HTMLDivElement>();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={1}>
            <IconButton
              onClick={() => setOpenNav(true)}
              sx={{ display: { lg: 'none' } }}
              aria-label="Hap menynë"
            >
              {React.createElement(ListIcon, { size: 24 })}
            </IconButton>

            <Tooltip title="Kërko faqe (⌘K)">
              <IconButton onClick={() => setSearchOpen(true)} aria-label="Kërko faqe">
                {React.createElement(MagnifyingGlassIcon, { size: 22 })}
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack sx={{ alignItems: 'center' }} direction="row" spacing={1.5}>
            <ThemeModeToggle />
            <AdminNotificationsMenu />
            <Avatar
              onClick={userPopover.handleOpen}
              ref={userPopover.anchorRef}
              src="/assets/avatar.png"
              sx={{ cursor: 'pointer', width: 36, height: 36 }}
            />
          </Stack>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorEl} onClose={userPopover.handleClose} open={userPopover.open} />
      <MobileNav
        onClose={() => {
          setOpenNav(false);
        }}
        open={openNav}
      />
      <AdminNavSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
