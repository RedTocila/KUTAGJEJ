'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { ProductTag } from '@/components/public/product-browse-chrome';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { LeadsHelpButton } from '@/components/user/leads-how-it-works';
import { useOwnerEditHeaderActions } from '@/components/user/owner-edit-header-actions';
import { UserNotificationRow } from '@/components/user/user-notification-row';
import {
  SavedListingPreviewDialog,
  type SavedListingPreviewTarget,
} from '@/components/user/saved-listing-preview-dialog';
import { useCopy } from '@/hooks/use-copy';
import { useGrowOrEliteEntitlement } from '@/hooks/use-grow-or-elite-entitlement';
import { groupUserNotifications } from '@/lib/notification-display';
import { notificationFilterIcon } from '@/lib/notification-filter-tags';
import {
  isLeadNotificationType,
  LEAD_NOTIFICATION_TAGS,
  notificationTagForType,
  type NotificationTag,
} from '@/lib/notification-tags';
import {
  listUserNotifications,
  markUserNotificationsRead,
  type UserNotification,
} from '@/lib/user-notifications-client';
import { paths } from '@/paths';

type LeadFilterTag = 'all' | 'listing_saved' | 'listing_shared' | 'listing_hot_lead';

function tagLabel(tag: NotificationTag, t: ReturnType<typeof useCopy>): string {
  return t.notifications.tags[tag];
}

export default function UserLeadsPage() {
  const t = useCopy();
  const entitled = useGrowOrEliteEntitlement();
  const [items, setItems] = React.useState<UserNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<LeadFilterTag>('all');
  const [listingPreview, setListingPreview] = React.useState<SavedListingPreviewTarget | null>(null);

  useOwnerEditHeaderActions(() => <LeadsHelpButton />, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const notifRes = await listUserNotifications(false, 80);
    if (notifRes.error) {
      setError(notifRes.error);
      setItems([]);
    } else {
      setItems((notifRes.notifications ?? []).filter((n) => isLeadNotificationType(n.type)));
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

  const groups = React.useMemo(() => groupUserNotifications(filtered), [filtered]);

  const counts = React.useMemo(() => {
    const map: Record<LeadFilterTag, number> = {
      all: items.length,
      listing_saved: 0,
      listing_shared: 0,
      listing_hot_lead: 0,
    };
    for (const item of items) {
      const tag = notificationTagForType(item.type);
      if (tag === 'listing_saved' || tag === 'listing_shared' || tag === 'listing_hot_lead') {
        map[tag] += 1;
      }
    }
    return map;
  }, [items]);

  const unreadLeadIds = React.useMemo(
    () => items.filter((n) => !n.readAt).map((n) => n.id),
    [items],
  );

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
      >
        <UserPageHeader
          icon={React.createElement(UsersThreeIcon, { size: 22, weight: 'duotone' })}
          title={t.notifications.leadsTitle}
          description={t.notifications.leadsDescription}
        />
        {entitled && unreadLeadIds.length > 0 ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              void markUserNotificationsRead(unreadLeadIds).then(() => refresh());
            }}
            sx={{ fontWeight: 700, borderRadius: 2, alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            {t.notifications.markAllRead}
          </Button>
        ) : null}
      </Stack>

      {entitled === false ? (
        <Alert
          severity="info"
          icon={<CrownIcon size={22} weight="duotone" />}
          action={
            <Button
              component={RouterLink}
              href={paths.user.packagesMain}
              color="inherit"
              size="small"
              sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              {t.notifications.leadsUpgradeCta}
            </Button>
          }
          sx={{ borderRadius: 2.5 }}
        >
          {t.notifications.leadsUpgrade}
        </Alert>
      ) : null}

      {entitled ? (
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all' as const, label: t.notifications.tags.all },
              ...LEAD_NOTIFICATION_TAGS.map((tag) => ({ key: tag, label: tagLabel(tag, t) })),
            ] as { key: LeadFilterTag; label: string }[]
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
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      {entitled === null || (loading && items.length === 0) ? (
        <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
          {t.common.loading}
        </Typography>
      ) : entitled === false ? null : groups.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
          {t.notifications.leadsEmpty}
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
                      borderColor:
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'divider',
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

      <SavedListingPreviewDialog
        open={Boolean(listingPreview)}
        target={listingPreview}
        onClose={() => setListingPreview(null)}
      />
    </Stack>
  );
}
