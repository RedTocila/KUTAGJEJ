'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Badge,
  Box,
  Divider,
  IconButton,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { UserNotificationRow } from '@/components/user/user-notification-row';
import {
  SavedListingPreviewDialog,
  type SavedListingPreviewTarget,
} from '@/components/user/saved-listing-preview-dialog';
import { groupUserNotifications } from '@/lib/notification-display';
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';
import { productPopoverPaperSx } from '@/styles/product-sx';

export function UserNotificationsMenu() {
  const { user } = useUser();
  const t = useCopy();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [items, setItems] = React.useState<UserNotification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [listingPreview, setListingPreview] = React.useState<SavedListingPreviewTarget | null>(null);

  const canUse =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const refresh = React.useCallback(async () => {
    if (!canUse) return;
    setLoading(true);
    const res = await listUserNotifications(false, 16);
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

  const groups = React.useMemo(() => groupUserNotifications(items).slice(0, 8), [items]);

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
          backdrop: {
            invisible: false,
            sx: {
              backgroundColor: 'rgba(8, 12, 18, 0.08)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            },
          },
          paper: {
            elevation: 0,
            sx: (theme) => ({
              ...productPopoverPaperSx(theme),
              width: 340,
              maxWidth: 'calc(100vw - 24px)',
              maxHeight: 'min(70dvh, 520px)',
              display: 'flex',
              flexDirection: 'column',
            }),
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.98rem' }}>
              {t.notifications.title}
            </Typography>
            {unread > 0 ? (
              <Typography
                color="primary"
                variant="body2"
                sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', flexShrink: 0 }}
                onClick={() => {
                  void markAllUserNotificationsRead().then(() => refresh());
                }}
              >
                {t.notifications.markAllRead}
              </Typography>
            ) : null}
          </Stack>
          {groups.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {loading ? t.common.loading : t.notifications.empty}
            </Typography>
          ) : null}
        </Box>
        {groups.length > 0 ? (
          <>
            <Divider
              sx={(theme) => ({
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
                flexShrink: 0,
              })}
            />
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                pb: 0.5,
              }}
            >
              {groups.map((group, index) => (
                <React.Fragment key={group.ids.join('-')}>
                  {index > 0 ? (
                    <Divider
                      sx={(theme) => ({
                        borderColor:
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
                      })}
                    />
                  ) : null}
                  <UserNotificationRow
                    group={group}
                    compact
                    onOpened={() => {
                      setAnchorEl(null);
                      void refresh();
                    }}
                    onViewListing={(target) => {
                      setListingPreview(target);
                      setAnchorEl(null);
                      void refresh();
                    }}
                  />
                </React.Fragment>
              ))}
            </Box>
            <Divider
              sx={(theme) => ({
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
                flexShrink: 0,
              })}
            />
            <Box sx={{ px: 1.5, py: 1, flexShrink: 0, textAlign: 'center' }}>
              <Link
                component={RouterLink}
                href={paths.user.notifications}
                underline="hover"
                variant="body2"
                onClick={() => setAnchorEl(null)}
                sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}
              >
                {t.notifications.viewAll}
              </Link>
            </Box>
          </>
        ) : null}
      </Popover>
      <SavedListingPreviewDialog
        open={Boolean(listingPreview)}
        target={listingPreview}
        onClose={() => setListingPreview(null)}
      />
    </>
  );
}
