'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Divider, ListItemIcon, MenuItem, MenuList, Popover, Typography } from '@mui/material';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';
import { productPopoverPaperSx } from '@/styles/product-sx';

export interface UserPopoverProps {
  anchorEl: Element | null;
  onClose: () => void;
  open: boolean;
}

export function UserPopover({ anchorEl, onClose, open }: UserPopoverProps) {
  const { user } = useUser();

  const handleSignOut = React.useCallback((): void => {
    onClose();
    void authClient.signOut();
  }, [onClose]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    (user?.accountType === 'managed' ? 'Staff' : 'Administrator');
  const email = user?.email || '';

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{
        paper: {
          elevation: 0,
          sx: (theme) => ({
            ...productPopoverPaperSx(theme),
            width: 260,
          }),
        },
      }}
    >
      <Box sx={{ px: 2.25, py: 1.75 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
          {displayName}
        </Typography>
        {email ? (
          <Typography color="text.secondary" variant="body2" noWrap sx={{ mt: 0.25 }}>
            {email}
          </Typography>
        ) : null}
      </Box>
      <Divider />
      <MenuList disablePadding sx={{ p: 1, '& .MuiMenuItem-root': { borderRadius: 2 } }}>
        <MenuItem component={RouterLink} href={paths.dashboard.profile} onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {React.createElement(UserGearIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          </ListItemIcon>
          Profili im
        </MenuItem>
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {React.createElement(SignOutIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          </ListItemIcon>
          Dil
        </MenuItem>
      </MenuList>
    </Popover>
  );
}
