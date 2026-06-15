'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { listAdminNotifications, markAllAdminNotificationsRead } from '@/lib/admin-notifications-client';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

export function AdminNotificationsMenu() {
  const { user } = useUser();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<{ id: string; title: string; message: string; createdAt: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const refresh = React.useCallback(async () => {
    if (!isPlatformAdmin) return;
    setLoading(true);
    const res = await listAdminNotifications(false, 8);
    if (!res.error) {
      setUnread(res.unread ?? 0);
      setItems(
        (res.notifications ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          createdAt: n.createdAt,
        })),
      );
    }
    setLoading(false);
  }, [isPlatformAdmin]);

  React.useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!isPlatformAdmin) return null;

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Njoftime">
        <Badge badgeContent={unread > 0 ? unread : 0} color="error" invisible={unread === 0}>
          <IconButton
            onClick={(e) => {
              setAnchorEl(e.currentTarget);
              void refresh();
            }}
          >
            {React.createElement(BellIcon, { size: 22 })}
          </IconButton>
        </Badge>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '95vw' } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Njoftime
            </Typography>
            {unread > 0 ? (
              <Button
                size="small"
                onClick={() => {
                  void markAllAdminNotificationsRead().then(() => refresh());
                }}
              >
                Lexo të gjitha
              </Button>
            ) : null}
          </Stack>
        </Box>
        <Divider />
        {loading ? (
          <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">
            Duke ngarkuar…
          </Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">
            Nuk ka njoftime të reja.
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton component={RouterLink} href={paths.dashboard.listingModeration} onClick={() => setAnchorEl(null)}>
                  <ListItemText
                    primary={item.title}
                    secondary={item.message}
                    slotProps={{
                      primary: { sx: { fontWeight: 600 }, noWrap: true },
                      secondary: { noWrap: true },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button component={RouterLink} href={paths.dashboard.listingModeration} size="small" onClick={() => setAnchorEl(null)}>
            Shiko radhën e moderimit
          </Button>
        </Box>
      </Popover>
    </>
  );
}
