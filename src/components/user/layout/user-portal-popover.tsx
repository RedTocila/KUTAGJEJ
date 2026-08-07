'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Divider, ListItemIcon, MenuItem, MenuList, Popover, Typography } from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';
import { authClient } from '@/lib/auth/client';
import { productPopoverPaperSx } from '@/styles/product-sx';

export interface UserPortalPopoverProps {
  anchorEl: Element | null;
  onClose: () => void;
  open: boolean;
  email?: string;
}

export function UserPortalPopover({ anchorEl, onClose, open, email }: UserPortalPopoverProps) {
  const t = useCopy();
  const handleSignOut = React.useCallback((): void => {
    onClose();
    void authClient.signOut();
  }, [onClose]);

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
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
      <Box sx={{ p: '16px 20px' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t.common.myAccount}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ wordBreak: 'break-word' }}>
          {email || '—'}
        </Typography>
      </Box>
      <Divider
        sx={(theme) => ({
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
        })}
      />
      <MenuList
        disablePadding
        sx={(theme) => ({
          p: '8px',
          '& .MuiMenuItem-root': {
            borderRadius: 1.5,
            color: 'text.primary',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'action.hover',
            },
          },
          '& .MuiListItemIcon-root': { color: 'text.secondary' },
        })}
      >
        <MenuItem component={RouterLink} href={paths.user.profile} onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {React.createElement(UserGearIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          </ListItemIcon>
          {t.nav.profile}
        </MenuItem>
        <MenuItem component={RouterLink} href={paths.user.notifications} onClick={onClose}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {React.createElement(BellIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          </ListItemIcon>
          {t.notifications.title}
        </MenuItem>
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {React.createElement(SignOutIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          </ListItemIcon>
          {t.nav.signOut}
        </MenuItem>
      </MenuList>
    </Popover>
  );
}
