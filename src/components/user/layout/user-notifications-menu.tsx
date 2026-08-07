'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  Link,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';
import { productPopoverPaperSx } from '@/styles/product-sx';

function relativeTime(iso: string, t: ReturnType<typeof useCopy>): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return t.notifications.justNow;
  if (mins < 60) return t.notifications.minutesAgo(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.notifications.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  return t.notifications.daysAgo(days);
}

export function UserNotificationsMenu() {
  const { user } = useUser();
  const t = useCopy();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<UserNotification[]>([]);
  const [loading, setLoading] = React.useState(false);

  const canUse =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const refresh = React.useCallback(async () => {
    if (!canUse) return;
    setLoading(true);
    const res = await listUserNotifications(false, 8);
    if (!res.error) {
      setUnread(res.unread ?? 0);
      setItems(res.notifications ?? []);
    }
    setLoading(false);
  }, [canUse]);

  React.useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  if (!canUse) return null;

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={t.notifications.title}>
        <Badge badgeContent={unread > 0 ? unread : 0} color="error" invisible={unread === 0}>
          <IconButton
            aria-label={t.notifications.title}
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
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: (theme) => ({
              ...productPopoverPaperSx(theme),
              width: 300,
            }),
          },
        }}
      >
        <Box sx={{ p: '16px 20px' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t.notifications.title}
            </Typography>
            <Link
              component={RouterLink}
              href={paths.user.notifications}
              underline="hover"
              variant="body2"
              onClick={() => setAnchorEl(null)}
              sx={{ fontWeight: 600, color: 'primary.main', flexShrink: 0 }}
            >
              {t.notifications.viewAll}
            </Link>
          </Stack>
          {unread > 0 ? (
            <Typography
              color="primary"
              variant="body2"
              sx={{ mt: 0.5, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                void markAllUserNotificationsRead().then(() => refresh());
              }}
            >
              {t.notifications.markAllRead}
            </Typography>
          ) : (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.35 }}>
              {loading && items.length === 0 ? t.common.loading : t.notifications.empty}
            </Typography>
          )}
        </Box>
        {items.length > 0 ? (
          <>
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
              })}
            >
              {items.map((item) => {
                const href = item.href || paths.user.notifications;
                const unreadItem = !item.readAt;
                return (
                  <MenuItem
                    key={item.id}
                    component={RouterLink}
                    href={href}
                    onClick={() => {
                      setAnchorEl(null);
                      if (unreadItem) {
                        void markUserNotificationRead(item.id).then(() => refresh());
                      }
                    }}
                    sx={{
                      alignItems: 'flex-start',
                      py: 1.1,
                      bgcolor: unreadItem
                        ? (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'action.hover'
                        : undefined,
                      whiteSpace: 'normal',
                    }}
                  >
                    <Box sx={{ minWidth: 0, width: '100%' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: unreadItem ? 700 : 600, lineHeight: 1.35 }}
                      >
                        {item.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.25, lineHeight: 1.35 }}
                      >
                        {item.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.35 }}>
                        {relativeTime(item.createdAt, t)}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </MenuList>
          </>
        ) : null}
      </Popover>
    </>
  );
}
