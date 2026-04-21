'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Avatar, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { List as ListIcon } from '@phosphor-icons/react/dist/ssr/List';
import { usePopover } from '@/hooks/use-popover';

import { paths } from '@/paths';
import { ThemeModeToggle } from '@/components/dashboard/layout/theme-mode-toggle';
import { useUser } from '@/hooks/use-user';

import { UserMobileNav } from './user-mobile-nav';
import { UserPortalPopover } from './user-portal-popover';

function titleForPath(pathname: string): string {
  if (pathname.startsWith(paths.user.profile)) return 'Profili im';
  return 'Përmbledhje';
}

export function UserMainNav() {
  const pathname = usePathname();
  const [openNav, setOpenNav] = React.useState(false);
  const userPopover = usePopover<HTMLDivElement>();
  const { user } = useUser();

  const title = titleForPath(pathname);
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();

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
          sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: '64px', px: 2 }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <IconButton
              onClick={() => setOpenNav(true)}
              sx={{ display: { lg: 'none' } }}
              aria-label="Hap menunë"
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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ThemeModeToggle />
            <Tooltip title="Llogaria ime">
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
