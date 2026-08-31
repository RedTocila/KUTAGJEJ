'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { paths } from '@/paths';
import { groupUserNotifications } from '@/lib/notification-display';
import { notificationFilterIcon } from '@/lib/notification-filter-tags';
import {
  isLeadNotificationType,
  NOTIFICATION_TAGS,
  notificationTagForType,
  type NotificationTag,
} from '@/lib/notification-tags';
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { TransientNotification } from '@/components/core/transient-success-alert';
import { ProductTag } from '@/components/public/product-browse-chrome';
import { FilterChipSkeletonRow, NotificationRowsSkeleton } from '@/components/user/inbox-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { LeadsTopHeaderButton } from '@/components/user/leads-top-header-button';
import {
  SavedListingPreviewDialog,
  type SavedListingPreviewTarget,
} from '@/components/user/saved-listing-preview-dialog';
import { UserNotificationRow } from '@/components/user/user-notification-row';

type InboxFilterTag = 'all' | 'messages' | 'listing_status' | 'reviews' | 'reservations';

function tagLabel(tag: NotificationTag, t: ReturnType<typeof useCopy>): string {
  return t.notifications.tags[tag];
}

export default function UserNotificationsPage() {
  const t = useCopy();
  const [items, setItems] = React.useState<UserNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<InboxFilterTag>('all');
  const [listingPreview, setListingPreview] = React.useState<SavedListingPreviewTarget | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listUserNotifications(false, 80);
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

  const inboxItems = React.useMemo(() => items.filter((n) => !isLeadNotificationType(n.type)), [items]);

  const filtered = React.useMemo(() => {
    if (filter === 'all') return inboxItems;
    return inboxItems.filter((item) => notificationTagForType(item.type) === filter);
  }, [filter, inboxItems]);

  const groups = React.useMemo(() => groupUserNotifications(filtered), [filtered]);

  const counts = React.useMemo(() => {
    const map: Record<InboxFilterTag, number> = {
      all: 0,
      messages: 0,
      listing_status: 0,
      reviews: 0,
      reservations: 0,
    };
    const allGroups = groupUserNotifications(inboxItems);
    map.all = allGroups.length;
    for (const group of allGroups) {
      const tag = notificationTagForType(group.primary.type);
      if (tag === 'messages' || tag === 'listing_status' || tag === 'reviews' || tag === 'reservations') {
        map[tag] += 1;
      }
    }
    return map;
  }, [inboxItems]);

  const showInitialSkeleton = loading && items.length === 0;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <LeadsTopHeaderButton />
      <Stack spacing={1.25}>
        <UserPageHeader
          icon={React.createElement(BellIcon, { size: 22, weight: 'duotone' })}
          title={t.notifications.title}
          description={t.notifications.pageDescription}
        />
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            pl: { xs: 0, sm: '52px' },
          }}
        >
          <Button
            component={RouterLink}
            href={paths.user.notificationSettings}
            size="small"
            variant="text"
            sx={{ fontWeight: 700, borderRadius: 2, px: 0 }}
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

      {showInitialSkeleton ? (
        <>
          <FilterChipSkeletonRow count={5} />
          {error ? <TransientNotification severity="error" message={error} onDismiss={() => setError(null)} /> : null}
          <NotificationRowsSkeleton count={6} />
        </>
      ) : (
        <>
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
            {(
              [
                { key: 'all' as const, label: t.notifications.tags.all },
                ...NOTIFICATION_TAGS.map((tag) => ({ key: tag, label: tagLabel(tag, t) })),
              ] as { key: InboxFilterTag; label: string }[]
            ).map(({ key, label }) => {
              const selected = filter === key;
              const count = counts[key];
              return (
                <ProductTag
                  key={key}
                  icon={notificationFilterIcon(key)}
                  label={count > 0 ? `${label} (${count})` : label}
                  active={selected}
                  onClick={() => setFilter(key)}
                />
              );
            })}
          </Stack>

          {error ? <TransientNotification severity="error" message={error} onDismiss={() => setError(null)} /> : null}

          {groups.length === 0 ? (
            <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
              {t.notifications.empty}
            </Typography>
          ) : (
            <Box
              sx={(theme) => ({
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
              })}
            >
              {groups.map((group, index) => {
                const tag = notificationTagForType(group.primary.type);
                return (
                  <React.Fragment key={group.ids.join('-')}>
                    {index > 0 ? (
                      <Divider
                        sx={(theme) => ({
                          borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
                        })}
                      />
                    ) : null}
                    <UserNotificationRow
                      group={group}
                      onOpened={() => void refresh()}
                      onViewListing={(target) => {
                        setListingPreview(target);
                        void refresh();
                      }}
                      showTag={
                        tag ? (
                          <Chip
                            size="small"
                            label={tagLabel(tag, t)}
                            sx={{
                              height: 20,
                              fontWeight: 700,
                              fontSize: '0.65rem',
                              borderRadius: 1.25,
                            }}
                          />
                        ) : null
                      }
                    />
                  </React.Fragment>
                );
              })}
            </Box>
          )}
        </>
      )}

      <SavedListingPreviewDialog
        open={Boolean(listingPreview)}
        target={listingPreview}
        onClose={() => setListingPreview(null)}
      />
    </Stack>
  );
}
