'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Badge,
  Box,
  Divider,
  Fab,
  IconButton,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { UserNotificationRow } from '@/components/user/user-notification-row';
import { NotificationRowsSkeleton } from '@/components/user/inbox-skeletons';
import {
  SavedListingPreviewDialog,
  type SavedListingPreviewTarget,
} from '@/components/user/saved-listing-preview-dialog';
import { groupUserNotifications } from '@/lib/notification-display';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { isPublicListingDetailPath } from '@/lib/public-browse-path';
import {
  markAllUserNotificationsRead,
} from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { useUserNotificationsInbox } from '@/hooks/use-user-notifications-inbox';
import { paths } from '@/paths';
import { productPopoverPaperSx } from '@/styles/product-sx';

function NotificationsPopoverPanel({
  groups,
  loading,
  unread,
  onMarkAllRead,
  onClose,
  onViewListing,
  onOpened,
}: {
  groups: ReturnType<typeof groupUserNotifications>;
  loading: boolean;
  unread: number;
  onMarkAllRead: () => void;
  onClose: () => void;
  onViewListing: (target: SavedListingPreviewTarget) => void;
  onOpened: () => void;
}) {
  const t = useCopy();

  return (
    <>
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
              onClick={onMarkAllRead}
            >
              {t.notifications.markAllRead}
            </Typography>
          ) : null}
        </Stack>
        {groups.length === 0 ? (
          loading ? (
            <Box sx={{ mt: 0.5 }}>
              <NotificationRowsSkeleton count={4} compact />
            </Box>
          ) : (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {t.notifications.empty}
            </Typography>
          )
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
                  onOpened={onOpened}
                  onViewListing={onViewListing}
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
              onClick={onClose}
              sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.8rem' }}
            >
              {t.notifications.viewAll}
            </Link>
          </Box>
        </>
      ) : null}
    </>
  );
}

function notificationsPopoverSlotProps(anchorOrigin: {
  horizontal: 'left' | 'right' | 'center';
  vertical: 'top' | 'bottom' | 'center';
}) {
  return {
    anchorOrigin,
    transformOrigin: {
      horizontal: anchorOrigin.horizontal,
      vertical: (anchorOrigin.vertical === 'bottom' ? 'top' : 'bottom') as 'top' | 'bottom',
    },
    slotProps: {
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
        sx: (theme: Parameters<typeof productPopoverPaperSx>[0]) => ({
          ...productPopoverPaperSx(theme),
          width: 340,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'min(70dvh, 520px)',
          display: 'flex',
          flexDirection: 'column',
        }),
      },
    },
  } as const;
}

export function UserNotificationsMenu() {
  const t = useCopy();
  const { canUse, unread, items, loading, refresh } = useUserNotificationsInbox();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [listingPreview, setListingPreview] = React.useState<SavedListingPreviewTarget | null>(null);

  const groups = React.useMemo(() => groupUserNotifications(items).slice(0, 8), [items]);

  if (!canUse) return null;

  const open = Boolean(anchorEl);
  const popover = notificationsPopoverSlotProps({ horizontal: 'right', vertical: 'bottom' });

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
        {...popover}
      >
        <NotificationsPopoverPanel
          groups={groups}
          loading={loading}
          unread={unread}
          onMarkAllRead={() => {
            void markAllUserNotificationsRead().then(() => refresh());
          }}
          onClose={() => setAnchorEl(null)}
          onOpened={() => {
            setAnchorEl(null);
            void refresh();
          }}
          onViewListing={(target) => {
            setAnchorEl(null);
            setListingPreview(target);
            void refresh();
          }}
        />
      </Popover>
      <SavedListingPreviewDialog
        open={Boolean(listingPreview)}
        target={listingPreview}
        onClose={() => setListingPreview(null)}
      />
    </>
  );
}

/** Fixed bottom-right bell when there are unread notifications. Mounted once from MainTabsShell. */
export function UserNotificationsFab() {
  const t = useCopy();
  const pathname = usePathname();
  const { canUse, unread, items, loading, refresh } = useUserNotificationsInbox();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [listingPreview, setListingPreview] = React.useState<SavedListingPreviewTarget | null>(null);

  const groups = React.useMemo(() => groupUserNotifications(items).slice(0, 8), [items]);
  const onSaves =
    pathname === paths.user.savedListings ||
    Boolean(pathname?.startsWith(`${paths.user.savedListings}/`));
  const onMessages =
    pathname === paths.user.messages || Boolean(pathname?.startsWith(`${paths.user.messages}/`));
  const onDashboardHome = pathname === paths.user.dashboard;
  const onOtherDashboard =
    Boolean(pathname?.startsWith(`${paths.user.dashboard}/`)) && !onSaves && !onMessages;
  const onListingDetail = isPublicListingDetailPath(pathname);
  const visible =
    canUse && unread > 0 && !onDashboardHome && !onOtherDashboard && !onListingDetail;
  const open = Boolean(anchorEl);
  const popover = notificationsPopoverSlotProps({ horizontal: 'right', vertical: 'top' });

  if (!canUse) return null;

  return (
    <>
      <Zoom in={visible} unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: {
              xs: `calc(${MOBILE_BOTTOM_NAV_OFFSET} + 12px)`,
              lg: 24,
            },
            zIndex: (theme) => theme.zIndex.appBar + 2,
            overflow: 'visible',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: 52,
              height: 52,
              overflow: 'visible',
              isolation: 'isolate',
            }}
          >
            <Fab
              color="primary"
              aria-label={t.notifications.title}
              onClick={(e) => {
                setAnchorEl(e.currentTarget);
                void refresh();
              }}
              sx={{
                width: 52,
                height: 52,
                // Theme Fab z-index sits above siblings; keep the count badge on top.
                zIndex: '0 !important',
                overflow: 'visible',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 8px 24px rgba(0,0,0,0.45)'
                    : '0 8px 24px rgba(118, 186, 27, 0.35)',
              }}
            >
              <BellIcon size={22} />
            </Fab>
            <Box
              component="span"
              aria-hidden
              sx={{
                position: 'absolute',
                top: -4,
                right: -4,
                zIndex: 2,
                minWidth: 18,
                height: 18,
                px: 0.5,
                borderRadius: 999,
                bgcolor: 'error.main',
                color: 'error.contrastText',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 800,
                lineHeight: 1,
                pointerEvents: 'none',
                border: 'none',
                boxShadow: 'none',
              }}
            >
              {unread > 99 ? '99+' : unread}
            </Box>
          </Box>
        </Box>
      </Zoom>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        {...popover}
      >
        <NotificationsPopoverPanel
          groups={groups}
          loading={loading}
          unread={unread}
          onMarkAllRead={() => {
            void markAllUserNotificationsRead().then(() => refresh());
          }}
          onClose={() => setAnchorEl(null)}
          onOpened={() => {
            setAnchorEl(null);
            void refresh();
          }}
          onViewListing={(target) => {
            setAnchorEl(null);
            setListingPreview(target);
            void refresh();
          }}
        />
      </Popover>
      <SavedListingPreviewDialog
        open={Boolean(listingPreview)}
        target={listingPreview}
        onClose={() => setListingPreview(null)}
      />
    </>
  );
}
