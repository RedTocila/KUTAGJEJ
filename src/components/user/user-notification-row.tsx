'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { ChatCircle as ChatIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';

import type { SavedListingPreviewTarget } from '@/components/user/saved-listing-preview-dialog';
import { startConversationWithMember } from '@/lib/conversations-client';
import {
  messageHrefFromNotification,
  notificationDisplayMessage,
  type NotificationGroup,
} from '@/lib/notification-display';
import { markUserNotificationsRead } from '@/lib/user-notifications-client';
import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';

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

function titleHintFromSaveMessage(message: string): string {
  const match = /«([^»]+)»/.exec(message);
  return match?.[1]?.trim() || message;
}

type Props = {
  group: NotificationGroup;
  compact?: boolean;
  showTag?: React.ReactNode;
  onOpened?: () => void;
  /** Opens a compact listing preview popup (save notifications). */
  onViewListing?: (target: SavedListingPreviewTarget) => void;
};

export function UserNotificationRow({
  group,
  compact = false,
  showTag,
  onOpened,
  onViewListing,
}: Props) {
  const t = useCopy();
  const router = useRouter();
  const { primary, ids, count, unread } = group;
  const [contacting, setContacting] = React.useState(false);
  const [contactError, setContactError] = React.useState<string | null>(null);

  const isSave = primary.type === 'listing_saved';
  const isShare = primary.type === 'listing_shared';
  const isHotLead = primary.type === 'listing_hot_lead';
  const isLead = isSave || isShare || isHotLead;
  const isMessage = primary.type === 'new_message';

  const title =
    isMessage && count > 1 && primary.actorName
      ? t.notifications.stackedMessages(count, primary.actorName)
      : primary.title;

  const message = notificationDisplayMessage(primary);
  const canPreviewListing = Boolean(isLead && primary.refId && primary.refKind);
  const messageHref = isMessage ? messageHrefFromNotification(primary) : primary.href || paths.user.notifications;

  const markRead = React.useCallback(async () => {
    if (!unread) return;
    await markUserNotificationsRead(ids);
  }, [ids, unread]);

  const handleOpenMessage = async (event?: React.MouseEvent) => {
    event?.preventDefault();
    await markRead();
    onOpened?.();
    router.push(messageHref);
  };

  const handleContact = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!primary.actorId || contacting) return;
    setContactError(null);
    setContacting(true);
    try {
      await markRead();
      const res = await startConversationWithMember(primary.actorId, {
        listingKind: primary.refKind || undefined,
        listingId: primary.refId || undefined,
      });
      if (res.error || !res.conversation?.id) {
        setContactError(res.error || 'Nuk u hap biseda.');
        return;
      }
      onOpened?.();
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setContacting(false);
    }
  };

  const handleViewListing = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!primary.refId || !primary.refKind) return;
    onViewListing?.({
      listingKind: primary.refKind,
      listingId: primary.refId,
      titleHint: titleHintFromSaveMessage(message),
    });
    void markRead();
  };

  const handleGenericOpen = async () => {
    await markRead();
    onOpened?.();
  };

  const iconBtnSx = {
    width: compact ? 28 : 32,
    height: compact ? 28 : 32,
    borderRadius: 1.25,
  } as const;

  const leadActions =
    isLead && (primary.actorId || canPreviewListing) ? (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0, ml: 1 }}>
        {primary.actorId ? (
          <IconButton
            size="small"
            color="primary"
            disabled={contacting}
            aria-label={t.notifications.contactSaver}
            onClick={(e) => void handleContact(e)}
            sx={{
              ...iconBtnSx,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText', opacity: 0.7 },
            }}
          >
            {contacting ? (
              <CircularProgress size={compact ? 12 : 14} color="inherit" />
            ) : (
              <ChatIcon size={compact ? 14 : 16} weight="bold" />
            )}
          </IconButton>
        ) : null}
        {canPreviewListing ? (
          <IconButton
            size="small"
            color="primary"
            aria-label={t.notifications.viewListing}
            onClick={(e) => void handleViewListing(e)}
            sx={{
              ...iconBtnSx,
              border: 'none',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
            }}
          >
            <EyeIcon size={compact ? 14 : 16} weight="bold" />
          </IconButton>
        ) : null}
      </Stack>
    ) : null;

  const body = (
    <Stack spacing={compact ? 0.2 : 0.55} sx={{ minWidth: 0, width: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography
          variant={compact ? 'body2' : 'body1'}
          sx={{
            fontWeight: unread ? 800 : 700,
            fontSize: compact ? '0.78rem' : '0.95rem',
            lineHeight: 1.25,
            pr: 0.5,
            minWidth: 0,
          }}
        >
          {title}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', flexShrink: 0, mt: 0.05 }}
        >
          {showTag}
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ lineHeight: 1.3, fontSize: compact ? '0.65rem' : undefined }}
          >
            {relativeTime(primary.createdAt, t)}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: compact ? 1 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.3,
            fontSize: compact ? '0.68rem' : '0.8rem',
            minWidth: 0,
            flex: 1,
            color: 'rgba(var(--mui-palette-text-primaryChannel) / 0.45)',
          }}
        >
          {message}
        </Typography>
        {leadActions}
      </Stack>
      {contactError ? (
        <Typography variant="caption" color="error" sx={{ lineHeight: 1.3 }}>
          {contactError}
        </Typography>
      ) : null}
    </Stack>
  );

  const shellSx = {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    px: compact ? 1.5 : { xs: 1.5, sm: 2 },
    py: compact ? 0.85 : 1.25,
    borderRadius: 0,
    bgcolor: unread
      ? (theme: { palette: { mode: string } }) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'action.hover'
      : 'transparent',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      bgcolor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.055)' : 'action.selected',
    },
  } as const;

  if (isLead) {
    return <Box sx={shellSx}>{body}</Box>;
  }

  if (isMessage) {
    return (
      <Box
        component="button"
        type="button"
        onClick={() => void handleOpenMessage()}
        sx={{
          ...shellSx,
          width: '100%',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
        }}
      >
        {body}
      </Box>
    );
  }

  return (
    <Box
      component={RouterLink}
      href={primary.href || paths.user.dashboard}
      onClick={() => void handleGenericOpen()}
      sx={shellSx}
    >
      {body}
    </Box>
  );
}
