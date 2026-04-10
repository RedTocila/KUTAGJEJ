import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Divider, ListItemIcon, MenuItem, MenuList, Popover, Typography } from '@mui/material';
import { SignOut as SignOutIcon } from '@phosphor-icons/react/dist/ssr/SignOut';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';
import Cookies from 'js-cookie';

import { paths } from '@/paths';

export interface UserPopoverProps {
  anchorEl: Element | null;
  onClose: () => void;
  open: boolean;
}

export function UserPopover({ anchorEl, onClose, open }: UserPopoverProps) {

  const handleSignOut = React.useCallback((): void => {
    // Close the popover
    onClose();

    // Clear all auth data
    localStorage.removeItem('custom-auth-token');
    localStorage.removeItem('user-data');
    localStorage.removeItem('user');
    
    // Clear cookies
    Cookies.remove('custom-auth-token');
    Cookies.remove('user-data');
    Cookies.remove('user');

    // Redirect to sign-in page using window.location for reliable logout
    window.location.href = paths.auth.signIn;
  }, [onClose]);

  const userData = React.useMemo(() => {
    try {
      const data = localStorage.getItem('user-data') || localStorage.getItem('user') || '{}';
      return JSON.parse(data);
    } catch {
      return {};
    }
  }, []);

  return (
    <Popover
      anchorEl={anchorEl}
      anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      onClose={onClose}
      open={open}
      slotProps={{ paper: { sx: { width: '240px' } } }}
    >
      <Box sx={{ p: '16px 20px ' }}>
        <Typography variant="subtitle1">Administrator</Typography>
        <Typography color="text.secondary" variant="body2">
          {userData.email || 'admin@example.com'}
        </Typography>
      </Box>
      <Divider />
      <MenuList disablePadding sx={{ p: '8px', '& .MuiMenuItem-root': { borderRadius: 1 } }}>
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
