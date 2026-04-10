'use client';

import * as React from 'react';
import { Avatar, Box, IconButton, Stack } from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { usePopover } from '@/hooks/use-popover';
import { useUser } from '@/hooks/use-user';
import { MobileNav } from './mobile-nav';
import { UserPopover } from '@/components/dashboard/layout/user-popover';

export function MainNav() {
  const [openNav, setOpenNav] = React.useState(false);
  const { user } = useUser();
  const userPopover = usePopover<HTMLDivElement>();

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';
  };

  return (
    <>
      <Box component="header" sx={{ borderBottom: '1px solid var(--mui-palette-divider)', backgroundColor: 'background.paper', position: 'sticky', top: 0, zIndex: 'appBar' }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}>
          <IconButton onClick={() => setOpenNav(true)} sx={{ display: { lg: 'none' } }}><ListIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Avatar onClick={userPopover.handleOpen} ref={userPopover.anchorRef} sx={{ cursor: 'pointer', bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 600 }}>{getInitials()}</Avatar>
        </Stack>
      </Box>
      <UserPopover anchorEl={userPopover.anchorEl} onClose={userPopover.handleClose} open={userPopover.open} />
      <MobileNav onClose={() => setOpenNav(false)} open={openNav} />
    </>
  );
}
