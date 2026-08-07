'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
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
import { productButtonSx } from '@/styles/product-sx';

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
  const isMessage = primary.type === 'new_message';

  const title =
    isMessage && count > 1 && primary.actorName
      ? t.notifications.stackedMessages(count, primary.actorName)
      : primary.title;

  const message = notificationDisplayMessage(primary);
  const canPreviewListing = Boolean(isSave && primary.refId && primary.refKind);
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
      const res = await startConversationWithMember(primary.actorId);
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

  const handleViewListing = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!primary.refId || !primary.refKind) return;
    await markRead();
    onViewListing?.({
      listingKind: primary.refKind,
      listingId: primary.refId,
      titleHint: titleHintFromSaveMessage(message),
    });
  };

  const handleGenericOpen = async () => {
    await markRead();
    onOpened?.();
  };

  const body = (
    <Stack spacing={compact ? 0.35 : 0.55} sx={{ minWidth: 0, width: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Typography
          variant={compact ? 'body2' : 'body1'}
          sx={{
            fontWeight: unread ? 800 : 700,
            fontSize: compact ? '0.84rem' : '0.95rem',
            lineHeight: 1.3,
            pr: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, lineHeight: 1.4, mt: 0.15 }}>
          {relativeTime(primary.createdAt, t)}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: compact ? 2 : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.35,
          fontSize: compact ? '0.72rem' : '0.8rem',
        }}
      >
        {message}
      </Typography>
      {contactError ? (
        <Typography variant="caption" color="error" sx={{ lineHeight: 1.3 }}>
          {contactError}
        </Typography>
      ) : null}
      {isSave ? (
        <Stack direction="row" spacing={0.75} sx={{ pt: 0.35, flexWrap: 'wrap' }}>
          {primary.actorId ? (
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={contacting}
              onClick={(e) => void handleContact(e)}
              startIcon={
                contacting ? (
                  <CircularProgress size={12} color="inherit" />
                ) : (
                  <ChatIcon size={14} weight="bold" />
                )
              }
              sx={{
                ...productButtonSx,
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 1.5,
                minHeight: 28,
                px: 1.1,
                py: 0.25,
                fontSize: '0.72rem',
              }}
            >
              {t.notifications.contactSaver}
            </Button>
          ) : null}
          {canPreviewListing ? (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => void handleViewListing(e)}
              startIcon={<EyeIcon size={14} weight="bold" />}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                borderRadius: 1.5,
                minHeight: 28,
                px: 1.1,
                py: 0.25,
                fontSize: '0.72rem',
                borderColor: 'divider',
              }}
            >
              {t.notifications.viewListing}
            </Button>
          ) : null}
        </Stack>
      ) : null}
      {showTag}
    </Stack>
  );

  const shellSx = {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    px: compact ? 1.25 : { xs: 1.5, sm: 2 },
    py: compact ? 1 : 1.25,
    borderRadius: compact ? 1.5 : 0,
    bgcolor: unread
      ? (theme: { palette: { mode: string } }) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover'
      : compact
        ? (theme: { palette: { mode: string } }) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'
      : 'transparent',
    transition: 'background-color 0.15s ease',
    '&:hover': {
      bgcolor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'action.selected',
    },
  } as const;

  if (isSave) {
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
