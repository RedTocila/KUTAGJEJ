'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { portalCardSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import {
  NOTIFICATION_TAGS,
  notificationTagForType,
  type NotificationTag,
} from '@/lib/notification-tags';
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { paths } from '@/paths';

type FilterTag = 'all' | NotificationTag;

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

function tagLabel(tag: NotificationTag, t: ReturnType<typeof useCopy>): string {
  return t.notifications.tags[tag];
}

export default function UserNotificationsPage() {
  const t = useCopy();
  const [items, setItems] = React.useState<UserNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<FilterTag>('all');

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listUserNotifications(false, 50);
    if (res.error) {
      setError(res.error);
      setItems([]);
      setUnread(0);
    } else {
      setItems(res.notifications ?? []);
      setUnread(res.unread ?? 0);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => notificationTagForType(item.type) === filter);
  }, [filter, items]);

  const counts = React.useMemo(() => {
    const map: Record<FilterTag, number> = {
      all: items.length,
      messages: 0,
      listing_saved: 0,
      listing_status: 0,
      reviews: 0,
      reservations: 0,
      verification: 0,
    };
    for (const item of items) {
      const tag = notificationTagForType(item.type);
      if (tag) map[tag] += 1;
    }
    return map;
  }, [items]);

  const onOpenItem = async (item: UserNotification) => {
    if (!item.readAt) {
      await markUserNotificationRead(item.id);
      void refresh();
    }
  };

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <UserPageHeader
          icon={React.createElement(BellIcon, { size: 22, weight: 'duotone' })}
          title={t.notifications.title}
          description={t.notifications.pageDescription}
        />
        <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, flexShrink: 0 }}>
          <Button
            component={RouterLink}
            href={paths.user.notificationSettings}
            size="small"
            variant="text"
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {t.notifications.managePrefs}
          </Button>
          {unread > 0 ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                void markAllUserNotificationsRead().then(() => refresh());
              }}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {t.notifications.markAllRead}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ ...portalCardSx, p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', mb: 1.5 }}>
          {(
            [
              { key: 'all' as const, label: t.notifications.tags.all },
              ...NOTIFICATION_TAGS.map((tag) => ({ key: tag, label: tagLabel(tag, t) })),
            ] as { key: FilterTag; label: string }[]
          ).map(({ key, label }) => {
            const selected = filter === key;
            const count = counts[key];
            return (
              <Chip
                key={key}
                label={count > 0 ? `${label} (${count})` : label}
                clickable
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => setFilter(key)}
                sx={{
                  fontWeight: 700,
                  borderRadius: 2,
                  ...(selected
                    ? null
                    : {
                        borderColor: 'divider',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      }),
                }}
              />
            );
          })}
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading && items.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ px: 0.5, py: 2 }}>
            {t.common.loading}
          </Typography>
        ) : filtered.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ px: 0.5, py: 2 }}>
            {t.notifications.empty}
          </Typography>
        ) : (
          <Stack
            spacing={0}
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              '& > *:not(:last-child)': {
                borderBottom: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            {filtered.map((item) => {
              const tag = notificationTagForType(item.type);
              const href = item.href || paths.user.dashboard;
              const unreadItem = !item.readAt;
              return (
                <Box
                  key={item.id}
                  component={RouterLink}
                  href={href}
                  onClick={() => {
                    void onOpenItem(item);
                  }}
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    px: { xs: 1.5, sm: 2 },
                    py: 1.5,
                    bgcolor: unreadItem
                      ? (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover'
                      : 'transparent',
                    transition: 'background-color 0.15s ease',
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'action.selected',
                    },
                  }}
                >
                  <Stack spacing={0.6}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: unreadItem ? 800 : 700, fontSize: '0.95rem', lineHeight: 1.35 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                        {relativeTime(item.createdAt, t)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                      {item.message}
                    </Typography>
                    {tag ? (
                      <Chip
                        size="small"
                        label={tagLabel(tag, t)}
                        sx={{
                          alignSelf: 'flex-start',
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          borderRadius: 1.5,
                        }}
                      />
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
