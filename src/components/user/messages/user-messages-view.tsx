'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContentText,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Checks as ChecksIcon } from '@phosphor-icons/react/dist/ssr/Checks';
import { CheckSquare as CheckSquareIcon } from '@phosphor-icons/react/dist/ssr/CheckSquare';
import { Paperclip as PaperclipIcon } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { PushPin as PushPinIcon } from '@phosphor-icons/react/dist/ssr/PushPin';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import {
  productFilterButtonSx,
  productSearchBarSx,
} from '@/components/public/product-browse-chrome';
import { ChatCallIcon, ChatWhatsappIcon } from '@/components/user/messages/chat-contact-icons';
import { useMessagesThreadChrome } from '@/contexts/messages-thread-chrome-context';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import {
  consumePendingListingChat,
  fetchConversationMessages,
  fetchConversations,
  getCachedConversations,
  getCachedThread,
  hideConversations,
  markConversationRead,
  removeCachedThreads,
  sendConversationMessage,
  setCachedConversations,
  setCachedThread,
  setConversationPinned,
  startConversation,
  type ConversationMessage,
  type ConversationSummary,
} from '@/lib/conversations-client';
import { setCachedUnreadMessagesCount } from '@/hooks/use-unread-messages-count';
import {
  consumePendingBusinessReservation,
  isReservationConversation,
  submitBusinessReservationToMessages,
} from '@/lib/business-reservation-message';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { isBusinessPortalAccount } from '@/lib/user-portal-account-label';
import { languageHtmlLang } from '@/lib/language';
import { toAbsoluteSiteUrl, whatsappInquireHref } from '@/lib/listing-contact';
import { uploadListingImages } from '@/lib/uploads-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';
import { logoGreen } from '@/styles/theme/colors';

function conversationContactPhone(conv: ConversationSummary): string | null {
  const listingPhone = conv.listingContactPhone?.trim() || '';
  const otherPhone = conv.otherParticipantPhone?.trim() || '';
  if (conv.role === 'inquirer') return listingPhone || otherPhone || null;
  return otherPhone || listingPhone || null;
}

function listingPublicHref(
  kind: ConversationSummary['listingKind'],
  listingId: ConversationSummary['listingId'],
): string | null {
  if (!kind || !listingId) return null;
  const entry = { id: listingId, permalinkPath: null as string | null };
  switch (kind) {
    case 'real-estate':
      return listingRealEstatePublicHref(entry);
    case 'cars':
      return listingCarPublicHref(entry);
    case 'jobs':
      return listingJobPublicHref(entry);
    case 'marketplace':
      return listingMarketplacePublicHref(entry);
    case 'businesses':
      return listingBusinessPublicHref(entry);
    case 'professionals':
      return listingProfessionalPublicHref(entry);
    default:
      return paths.home;
  }
}

/** Chat accents — platform brand greens (`logoGreen` / primary). */
const CHAT_ACCENT = logoGreen[500];
const CHAT_ACCENT_HOVER = logoGreen[600];
const CHAT_ACCENT_SOFT = 'rgba(130, 201, 30, 0.1)';
const CHAT_ACCENT_GLOW = '0 2px 10px rgba(130, 201, 30, 0.45)';
const CHAT_BUBBLE_MINE_DARK = logoGreen[600];
const CHAT_BUBBLE_THEIRS_DARK = '#2e2e2e';
const CHAT_BUBBLE_MINE_LIGHT = logoGreen[200];
const CHAT_BUBBLE_THEIRS_LIGHT = '#d0d0d0';
const CHAT_BUBBLE_MINE_INK = logoGreen[950];
/** Bubble corner radii: top-left, top-right, bottom-right, bottom-left (px). */
const CHAT_BUBBLE_RADIUS_MINE = [12, 12, 4, 12] as const;
const CHAT_BUBBLE_RADIUS_THEIRS = [4, 12, 12, 12] as const;
const CHAT_IMAGE_INSET = 3;

function formatMessageTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatConversationListTime(iso: string, locale: string, yesterday: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startToday.getTime() - startMsg.getTime()) / 86_400_000);
  if (dayDiff === 0) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (dayDiff === 1) return yesterday;
  if (dayDiff < 7) {
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

type InboxFilter = 'all' | 'unread' | 'reservations';

function conversationHasMessages(item: Pick<ConversationSummary, 'lastMessageAt' | 'lastMessageText'>): boolean {
  return Boolean(item.lastMessageAt) || Boolean(String(item.lastMessageText || '').trim());
}

function conversationActivityAt(item: ConversationSummary): number {
  const raw = item.lastMessageAt || item.updatedAt;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortConversationsByRecent(items: ConversationSummary[]): ConversationSummary[] {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return conversationActivityAt(b) - conversationActivityAt(a);
  });
}

/** Inbox only lists threads that actually have a message. */
function inboxConversations(items: ConversationSummary[]): ConversationSummary[] {
  return items.filter(conversationHasMessages);
}

function filterConversations(items: ConversationSummary[], filter: InboxFilter): ConversationSummary[] {
  if (filter === 'unread') return items.filter((c) => c.unreadCount > 0);
  if (filter === 'reservations') return items.filter(isReservationConversation);
  return items;
}

function patchConversationInList(
  prev: ConversationSummary[],
  conversationId: string,
  patch: Partial<ConversationSummary>,
  fallback: ConversationSummary | null,
): ConversationSummary[] {
  const idx = prev.findIndex((c) => c.id === conversationId);
  if (idx >= 0) {
    return prev.map((c) => (c.id === conversationId ? { ...c, ...patch } : c));
  }
  if (fallback) {
    return [{ ...fallback, ...patch, unreadCount: 0 }, ...prev];
  }
  return prev;
}

/** Last N of my messages are still unread by the other party → delivered; older → read. */
function deliveryStatusByMessageId(
  messages: ConversationMessage[],
  otherUnreadCount: number,
): Map<string, 'delivered' | 'read'> {
  const map = new Map<string, 'delivered' | 'read'>();
  let remaining = Math.max(0, otherUnreadCount);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg.isMine) continue;
    if (remaining > 0) {
      map.set(msg.id, 'delivered');
      remaining -= 1;
    } else {
      map.set(msg.id, 'read');
    }
  }
  return map;
}

/** Listing chrome only when *you* contacted from a listing (inquirer). All other chats show the person. */
function isPersonFocusedConversation(
  item: Pick<ConversationSummary, 'role' | 'listingId'>,
): boolean {
  return item.role !== 'inquirer' || !item.listingId;
}

const LONG_PRESS_MS = 480;

function ConversationListItem({
  item,
  active,
  isLast,
  selectionMode,
  selected,
  onOpen,
  onToggleSelect,
  onOpenActions,
}: {
  item: ConversationSummary;
  active: boolean;
  isLast?: boolean;
  selectionMode: boolean;
  selected: boolean;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOpenActions: (id: string, anchor: HTMLElement, point?: { left: number; top: number }) => void;
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const locale = languageHtmlLang(language);
  const unread = item.unreadCount > 0;
  const pinned = Boolean(item.pinned);
  const lastMine = Boolean(item.lastMessageIsMine);
  const lastDeliveryStatus: 'delivered' | 'read' | null = lastMine
    ? (item.otherUnreadCount ?? 0) > 0
      ? 'delivered'
      : 'read'
    : null;
  const timeLabel = formatConversationListTime(
    item.lastMessageAt || item.updatedAt,
    locale,
    t.messages.yesterday,
  );
  const showListing = !isPersonFocusedConversation(item) && Boolean(item.listingTitle?.trim());
  const title = showListing
    ? item.listingTitle.trim()
    : item.otherParticipantName?.trim() || t.messages.userFallback;
  const avatarUrl = showListing ? item.listingImageUrl : item.otherParticipantAvatarUrl;
  const preview = item.lastMessageText || t.messages.noMessagesYet;
  const longPressTimer = React.useRef<number | null>(null);
  const suppressClick = React.useRef(false);
  const touchOrigin = React.useRef<{ x: number; y: number } | null>(null);
  const rootRef = React.useRef<HTMLButtonElement | null>(null);

  const clearLongPress = React.useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchOrigin.current = null;
  }, []);

  const startLongPress = (clientX: number, clientY: number) => {
    if (selectionMode) return;
    clearLongPress();
    touchOrigin.current = { x: clientX, y: clientY };
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      suppressClick.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      const el = rootRef.current;
      if (el) onOpenActions(item.id, el, { left: clientX, top: clientY });
    }, LONG_PRESS_MS);
  };

  React.useEffect(() => () => clearLongPress(), [clearLongPress]);

  return (
    <Box
      ref={rootRef}
      component="button"
      type="button"
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (selectionMode) {
          onToggleSelect(item.id);
          return;
        }
        onOpen(item.id);
      }}
      onContextMenu={(e) => {
        if (selectionMode) return;
        e.preventDefault();
        onOpenActions(item.id, e.currentTarget, { left: e.clientX, top: e.clientY });
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        startLongPress(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        const origin = touchOrigin.current;
        const touch = e.touches[0];
        if (!origin || !touch) return;
        if (Math.abs(touch.clientX - origin.x) > 12 || Math.abs(touch.clientY - origin.y) > 12) {
          clearLongPress();
        }
      }}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
      aria-current={!selectionMode && active ? 'true' : undefined}
      aria-pressed={selectionMode ? selected : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        m: 0,
        pl: { xs: 2, md: 1.5 },
        pr: { xs: 2, md: 1.5 },
        py: 0,
        border: 0,
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        bgcolor: (theme) => {
          if (selectionMode && selected) {
            return theme.palette.mode === 'dark' ? 'rgba(76,167,76,0.14)' : 'rgba(76,167,76,0.1)';
          }
          if (active && !selectionMode) {
            return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
          }
          return 'transparent';
        },
        WebkitTapHighlightColor: 'transparent',
        transition: 'background-color 0.12s ease',
        '&:hover': {
          bgcolor: (theme) => {
            if (selectionMode && selected) {
              return theme.palette.mode === 'dark' ? 'rgba(76,167,76,0.18)' : 'rgba(76,167,76,0.14)';
            }
            return theme.palette.mode === 'dark'
              ? active && !selectionMode
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)'
              : active && !selectionMode
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(0,0,0,0.03)';
          },
        },
        '&:active': {
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        },
      }}
    >
      {selectionMode ? (
        <Box
          aria-hidden
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            border: '2px solid',
            borderColor: selected ? CHAT_ACCENT : 'divider',
            bgcolor: selected ? CHAT_ACCENT : 'transparent',
            color: selected ? '#0a0a0a' : 'transparent',
          }}
        >
          <CheckIcon size={12} weight="bold" />
        </Box>
      ) : null}

      <Box sx={{ position: 'relative', flexShrink: 0, my: 1.15 }}>
        <Avatar
          src={avatarUrl ?? undefined}
          variant={showListing ? 'rounded' : 'circular'}
          sx={{
            width: 49,
            height: 49,
            borderRadius: showListing ? 1.5 : '50%',
            fontWeight: 700,
            fontSize: '1.1rem',
            ...(avatarUrl
              ? {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.06)',
                  color: 'text.secondary',
                }
              : {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }),
          }}
        >
          {title.slice(0, 1).toUpperCase()}
        </Avatar>
        {pinned && !selectionMode ? (
          <Box
            aria-label={t.messages.pinnedAria}
            sx={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'background.paper',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <PushPinIcon size={10} weight="fill" />
          </Box>
        ) : null}
      </Box>

      <Stack
        spacing={0.2}
        sx={{
          flex: 1,
          minWidth: 0,
          py: 1.35,
          borderBottom: isLast ? 'none' : '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography
            sx={{
              fontWeight: unread ? 700 : 500,
              fontSize: '1.05rem',
              lineHeight: 1.3,
              color: 'text.primary',
            }}
            noWrap
          >
            {title}
          </Typography>
          {timeLabel ? (
            <Typography
              sx={{
                flexShrink: 0,
                fontSize: '0.75rem',
                fontWeight: unread ? 600 : 400,
                color: 'rgba(var(--mui-palette-text-primaryChannel) / 0.45)',
                lineHeight: 1.2,
                ml: 1,
              }}
            >
              {timeLabel}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 22 }}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}
          >
            {lastDeliveryStatus ? (
              <Box
                component="span"
                aria-label={
                  lastDeliveryStatus === 'read' ? t.messages.read : t.messages.delivered
                }
                sx={{
                  display: 'inline-flex',
                  flexShrink: 0,
                  lineHeight: 0,
                  color:
                    lastDeliveryStatus === 'read'
                      ? '#53bdeb'
                      : 'rgba(var(--mui-palette-text-primaryChannel) / 0.45)',
                }}
              >
                <ChecksIcon size={16} weight="bold" />
              </Box>
            ) : null}
            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: '0.875rem',
                fontWeight: unread ? 500 : 400,
                lineHeight: 1.35,
                color: 'rgba(var(--mui-palette-text-primaryChannel) / 0.45)',
              }}
              noWrap
            >
              {preview}
            </Typography>
          </Stack>
          {unread ? (
            <Box
              sx={{
                flexShrink: 0,
                minWidth: 20,
                height: 20,
                px: 0.55,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '0.7rem',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Box>
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}

function MessageBubble({
  message,
  deliveryStatus,
  onMediaLoad,
}: {
  message: ConversationMessage;
  deliveryStatus?: 'delivered' | 'read';
  /** Fires when an image finishes loading so the thread can re-pin to bottom. */
  onMediaLoad?: () => void;
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const locale = languageHtmlLang(language);
  const mine = message.isMine;
  const isRead = deliveryStatus === 'read';
  const imageUrl = String(message.imageUrl || '').trim();
  const body = String(message.body || '').trim();
  const imageOnly = Boolean(imageUrl) && !body;
  const metaWidth = mine && deliveryStatus ? 58 : 42;
  const bubbleRadius = mine ? CHAT_BUBBLE_RADIUS_MINE : CHAT_BUBBLE_RADIUS_THEIRS;
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [imageUrl]);

  // Concentric with bubble; caption images also round the bottom edge.
  const imageRadius = body
    ? [
        Math.max(8, bubbleRadius[0] - CHAT_IMAGE_INSET),
        Math.max(8, bubbleRadius[1] - CHAT_IMAGE_INSET),
        8,
        8,
      ]
        .map((r) => `${r}px`)
        .join(' ')
    : bubbleRadius.map((r) => `${Math.max(0, r - CHAT_IMAGE_INSET)}px`).join(' ');

  const handleImageLoad = React.useCallback(() => {
    setImageLoaded(true);
    setImageFailed(false);
    onMediaLoad?.();
  }, [onMediaLoad]);

  const handleImageError = React.useCallback(() => {
    setImageLoaded(true);
    setImageFailed(true);
  }, []);

  const imgRef = React.useCallback(
    (node: HTMLImageElement | null) => {
      if (!node) return;
      // Cached images may already be complete before onLoad attaches.
      if (node.complete && node.naturalWidth > 0) {
        handleImageLoad();
      } else if (node.complete && node.naturalWidth === 0) {
        handleImageError();
      }
    },
    [handleImageError, handleImageLoad],
  );

  const meta = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        pointerEvents: 'none',
        ...(imageOnly
          ? {
              position: 'absolute',
              right: 8,
              bottom: 8,
              px: 0.6,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'rgba(0,0,0,0.45)',
            }
          : {
              position: 'absolute',
              right: 10,
              bottom: 8,
            }),
      }}
    >
      <Typography
        sx={(theme) => ({
          fontSize: '0.68rem',
          fontWeight: 600,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          color: imageOnly
            ? 'rgba(255,255,255,0.75)'
            : mine
              ? 'rgba(13, 34, 1, 0.55)'
              : 'text.secondary',
          ...theme.applyStyles('dark', {
            color: imageOnly
              ? 'rgba(255,255,255,0.75)'
              : mine
                ? 'rgba(13, 34, 1, 0.55)'
                : 'var(--mui-palette-text-secondary)',
          }),
        })}
      >
        {formatMessageTime(message.createdAt, locale)}
      </Typography>
      {mine && deliveryStatus ? (
        <Box
          component="span"
          aria-label={isRead ? t.messages.read : t.messages.delivered}
          sx={{
            display: 'inline-flex',
            lineHeight: 0,
            color: isRead ? '#1a6b8a' : 'rgba(13, 34, 1, 0.55)',
          }}
        >
          <ChecksIcon size={14} weight="bold" />
        </Box>
      ) : null}
    </Box>
  );

  return (
    <>
    <Box
      sx={{
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        px: { xs: 1.5, md: 2 },
        py: 0.35,
      }}
    >
      <Box
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          width: imageUrl ? 'min(82%, 280px)' : 'auto',
          maxWidth: '82%',
          overflow: 'hidden',
          bgcolor: mine ? CHAT_BUBBLE_MINE_LIGHT : CHAT_BUBBLE_THEIRS_LIGHT,
          color: mine ? CHAT_BUBBLE_MINE_INK : 'text.primary',
          borderRadius: bubbleRadius.map((r) => `${r}px`).join(' '),
          ...theme.applyStyles('dark', {
            bgcolor: mine ? CHAT_BUBBLE_MINE_DARK : CHAT_BUBBLE_THEIRS_DARK,
            color: mine ? CHAT_BUBBLE_MINE_INK : 'var(--mui-palette-text-primary)',
          }),
        })}
      >
        {imageUrl ? (
          <Box
            sx={{
              position: 'relative',
              lineHeight: 0,
              m: `${CHAT_IMAGE_INSET}px`,
              borderRadius: imageRadius,
              overflow: 'hidden',
              // Neutral slot so green bubbles don’t look “empty” while the photo loads.
              bgcolor: mine ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)',
              minHeight: 160,
              aspectRatio: '4 / 3',
            }}
          >
            {!imageLoaded && !imageFailed ? (
              <Box
                aria-busy
                aria-label={t.messages.imageLoadingAria}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  display: 'grid',
                  placeItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0,0,0,0.55)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                  }}
                >
                  <CircularProgress
                    size={32}
                    thickness={5}
                    sx={{
                      color: '#fff',
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                    }}
                  />
                </Box>
              </Box>
            ) : null}
            {imageFailed ? (
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  width: '100%',
                  minHeight: 160,
                  aspectRatio: '4 / 3',
                  px: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650, textAlign: 'center' }}>
                  {t.messages.imageLoadFailed}
                </Typography>
              </Box>
            ) : (
              <Box
                component="img"
                ref={imgRef}
                src={imageUrl}
                alt=""
                loading="eager"
                decoding="async"
                role="button"
                tabIndex={0}
                aria-label={t.messages.imagePreviewAria}
                onClick={() => {
                  if (!imageLoaded) return;
                  setPreviewOpen(true);
                }}
                onKeyDown={(e) => {
                  if (!imageLoaded) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPreviewOpen(true);
                  }
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                sx={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  minHeight: 160,
                  maxHeight: 360,
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  cursor: imageLoaded ? 'pointer' : 'default',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              />
            )}
            {imageOnly ? meta : null}
          </Box>
        ) : null}
        {!imageOnly ? (
          <Box
            sx={{
              position: 'relative',
              px: 1.35,
              pt: 0.75,
              pb: 0.75,
              minWidth: body ? undefined : metaWidth + 16,
            }}
          >
            {body ? (
              <Typography
                component="div"
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {body}
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    display: 'inline-block',
                    width: metaWidth,
                    height: '1.15em',
                    verticalAlign: 'bottom',
                  }}
                />
              </Typography>
            ) : null}
            {meta}
          </Box>
        ) : null}
      </Box>
    </Box>

    {imageUrl ? (
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullScreen
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(0,0,0,0.96)',
              backgroundImage: 'none',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <IconButton
          type="button"
          onClick={() => setPreviewOpen(false)}
          aria-label={t.messages.closePreviewAria}
          sx={{
            position: 'fixed',
            top: { xs: 'max(12px, env(safe-area-inset-top))', md: 16 },
            right: { xs: 'max(12px, env(safe-area-inset-right))', md: 16 },
            zIndex: 1,
            width: 44,
            height: 44,
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
          }}
        >
          <XIcon size={22} weight="bold" />
        </IconButton>
        <Box
          onClick={() => setPreviewOpen(false)}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            p: { xs: 1.5, md: 3 },
            cursor: 'zoom-out',
            position: 'relative',
          }}
        >
          {!imageLoaded && !imageFailed ? (
            <Box
              sx={{
                position: 'absolute',
                display: 'grid',
                placeItems: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.55)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
              }}
            >
              <CircularProgress
                size={36}
                thickness={5}
                sx={{
                  color: '#fff',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }}
              />
            </Box>
          ) : null}
          {!imageFailed ? (
            <Box
              component="img"
              src={imageUrl}
              alt=""
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 1,
                userSelect: 'none',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.15s ease',
              }}
            />
          ) : (
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 650 }}>
              {t.messages.imageLoadFailed}
            </Typography>
          )}
        </Box>
      </Dialog>
    ) : null}
    </>
  );
}

/** Isolated composer — keeps draft keystrokes from re-rendering the thread. */
function MessageComposer({
  onSend,
}: {
  onSend: (body: string, file?: File | null) => Promise<boolean>;
}) {
  const t = useCopy();
  const [draft, setDraft] = React.useState('');
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = React.useState<string | null>(null);
  const [inputExpanded, setInputExpanded] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const canSend = draft.trim().length > 0 || Boolean(attachment);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !draft) {
      setInputExpanded(false);
      return;
    }
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
      setInputExpanded(el.scrollHeight > lineHeight + 4);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [draft]);

  React.useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = () => {
    const body = draft.trim();
    if (!body && !attachment) return;
    const file = attachment;
    setDraft('');
    clearAttachment();
    void onSend(body, file).then((ok) => {
      if (!ok) setDraft(body);
    });
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 0.75,
        px: { xs: 1.25, md: 1.5 },
        pt: 0.5,
        pb: { xs: 'max(10px, env(safe-area-inset-bottom))', md: 1.25 },
        bgcolor: 'transparent',
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' },
      }}
    >
      {attachmentPreview ? (
        <Box sx={{ position: 'relative', width: 72, height: 72, alignSelf: 'flex-start' }}>
          <Box
            component="img"
            src={attachmentPreview}
            alt=""
            sx={{
              width: 72,
              height: 72,
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'rgba(0,0,0,0.45)',
              display: 'block',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}
          />
          <IconButton
            type="button"
            size="small"
            onClick={clearAttachment}
            aria-label={t.messages.removeAttachAria}
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 22,
              height: 22,
              bgcolor: 'rgba(0,0,0,0.65)',
              border: '1px solid',
              borderColor: 'rgba(255,255,255,0.25)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)', color: '#fff' },
            }}
          >
            <XIcon size={12} weight="bold" />
          </IconButton>
        </Box>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setAttachment(file);
        }}
      />

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        sx={(theme) => ({
          display: 'flex',
          gap: 1,
          p: 1,
          alignItems: inputExpanded ? 'flex-end' : 'center',
          transition: 'border-radius 120ms ease',
          ...productSearchBarSx(Boolean(draft.trim()) || Boolean(attachment), {
            color: CHAT_ACCENT,
            soft: CHAT_ACCENT_SOFT,
          }),
          borderRadius: inputExpanded ? 2.5 : 999,
          height: 'auto',
          minHeight: 40,
          bgcolor: 'background.paper',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          ...theme.applyStyles('dark', {
            bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.92)',
          }),
        })}
      >
        <IconButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t.messages.attachAria}
          size="small"
          sx={{
            flexShrink: 0,
            p: 0.5,
            color: CHAT_ACCENT,
            opacity: attachment ? 1 : 0.85,
            alignSelf: inputExpanded ? 'flex-end' : 'center',
            mb: inputExpanded ? 0.25 : 0,
          }}
        >
          <PaperclipIcon size={22} weight="bold" />
        </IconButton>

        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder={t.messages.placeholder}
          value={draft}
          inputRef={inputRef}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'transparent',
              alignItems: inputExpanded ? 'flex-start' : 'center',
              py: 0.25,
              pl: 0,
              fontSize: '0.9rem',
              fontWeight: 500,
              '& fieldset': { border: 'none' },
            },
            '& .MuiOutlinedInput-input': {
              pl: 0,
            },
            '& textarea': {
              resize: 'none',
              lineHeight: 1.4,
            },
          }}
        />

        <IconButton
          type="submit"
          disabled={!canSend}
          aria-label={t.messages.sendAria}
          sx={{
            flexShrink: 0,
            alignSelf: inputExpanded ? 'flex-end' : 'center',
            ...productFilterButtonSx(true),
            bgcolor: CHAT_ACCENT,
            color: '#0a0a0a',
            borderColor: CHAT_ACCENT,
            boxShadow: canSend ? CHAT_ACCENT_GLOW : 'none',
            '&:hover': {
              bgcolor: CHAT_ACCENT_HOVER,
              borderColor: CHAT_ACCENT_HOVER,
              boxShadow: canSend ? CHAT_ACCENT_GLOW : 'none',
            },
            '&.Mui-disabled': {
              bgcolor: CHAT_ACCENT,
              color: '#0a0a0a',
              opacity: 0.4,
              boxShadow: 'none',
            },
          }}
        >
          <PaperPlaneTiltIcon size={18} weight="fill" />
        </IconButton>
      </Box>
    </Box>
  );
}

export function UserMessagesView() {
  const t = useCopy();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadChrome = useMessagesThreadChrome();
  const urlSelectedId = searchParams.get('c');
  const isBusinessAccount = isBusinessPortalAccount(user);

  const inboxFilterLabels: Record<InboxFilter, string> = {
    all: t.messages.all,
    unread: t.messages.unread,
    reservations: t.messages.reservations,
  };

  const [conversations, setConversations] = React.useState<ConversationSummary[]>(
    () => inboxConversations(getCachedConversations() ?? []),
  );
  const [messages, setMessages] = React.useState<ConversationMessage[]>(() =>
    urlSelectedId ? (getCachedThread(urlSelectedId)?.messages ?? []) : [],
  );
  const [activeConversation, setActiveConversation] = React.useState<ConversationSummary | null>(() => {
    if (!urlSelectedId) return null;
    return (
      getCachedThread(urlSelectedId)?.conversation ??
      getCachedConversations()?.find((c) => c.id === urlSelectedId) ??
      null
    );
  });
  const [inboxFilter, setInboxFilter] = React.useState<InboxFilter>('all');
  const [listLoading, setListLoading] = React.useState(() => !getCachedConversations());
  const [threadLoading, setThreadLoading] = React.useState(() =>
    Boolean(urlSelectedId) && !getCachedThread(urlSelectedId!),
  );
  const [markingAllRead, setMarkingAllRead] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /** Instant mobile dismiss before URL `?c=` clears (router can lag). */
  const [mobileThreadDismissed, setMobileThreadDismissed] = React.useState(false);
  /** Instant open before URL `?c=` updates (router can lag). */
  const [instantSelectedId, setInstantSelectedId] = React.useState<string | null>(null);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const [actionConversationId, setActionConversationId] = React.useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = React.useState<null | {
    el: HTMLElement;
    position?: { top: number; left: number };
  }>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState<string[] | null>(null);
  const [deletingChats, setDeletingChats] = React.useState(false);
  const [pinningChat, setPinningChat] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = React.useRef<HTMLDivElement | null>(null);
  const messagesContentRef = React.useRef<HTMLDivElement | null>(null);
  /** Keep the viewport pinned to the latest message until the user scrolls up. */
  const stickToBottomRef = React.useRef(true);
  const pendingHandled = React.useRef(false);
  const selectedIdRef = React.useRef<string | null>(null);
  const conversationsRef = React.useRef(conversations);
  conversationsRef.current = conversations;
  const activeConversationRef = React.useRef(activeConversation);
  activeConversationRef.current = activeConversation;

  const selectedId = mobileThreadDismissed ? null : (instantSelectedId ?? urlSelectedId);
  selectedIdRef.current = selectedId;

  React.useEffect(() => {
    if (instantSelectedId && urlSelectedId === instantSelectedId) {
      setInstantSelectedId(null);
    }
  }, [urlSelectedId, instantSelectedId]);

  const unreadConversations = React.useMemo(
    () => conversations.filter((c) => c.unreadCount > 0),
    [conversations],
  );
  const unreadTotal = unreadConversations.length;
  const reservationConversations = React.useMemo(
    () => conversations.filter(isReservationConversation),
    [conversations],
  );
  const reservationsTotal = reservationConversations.length;
  const filteredConversations = React.useMemo(
    () => filterConversations(conversations, inboxFilter),
    [conversations, inboxFilter],
  );
  React.useEffect(() => {
    if (!isBusinessAccount && inboxFilter === 'reservations') {
      setInboxFilter('all');
    }
  }, [isBusinessAccount, inboxFilter]);

  const inboxTabs = React.useMemo(() => {
    const tabs: { id: InboxFilter; count: number }[] = [
      { id: 'all', count: conversations.length },
      { id: 'unread', count: unreadTotal },
    ];
    if (isBusinessAccount) {
      tabs.push({ id: 'reservations', count: reservationsTotal });
    }
    return tabs;
  }, [conversations.length, isBusinessAccount, reservationsTotal, unreadTotal]);
  const actionConversation = React.useMemo(
    () => conversations.find((c) => c.id === actionConversationId) ?? null,
    [conversations, actionConversationId],
  );
  const selectedCount = selectedIds.size;

  const hydrateThreadLocally = React.useCallback((conversationId: string) => {
    const cached = getCachedThread(conversationId);
    const fromInbox =
      conversationsRef.current.find((c) => c.id === conversationId) ??
      getCachedConversations()?.find((c) => c.id === conversationId) ??
      null;

    if (cached) {
      setMessages(cached.messages);
      setActiveConversation(cached.conversation);
      setThreadLoading(false);
      return true;
    }

    setMessages([]);
    if (fromInbox) {
      setActiveConversation(fromInbox);
      // Header paints now; messages area keeps a light loader until fetch lands.
      setThreadLoading(true);
      return true;
    }

    setActiveConversation(null);
    setThreadLoading(true);
    return false;
  }, []);

  const loadInbox = React.useCallback(async () => {
    // Show cached inbox immediately on remount while refreshing in the background.
    const cached = getCachedConversations();
    if (cached) {
      setConversations(sortConversationsByRecent(inboxConversations(cached)));
      setListLoading(false);
    } else {
      setListLoading(true);
    }
    const res = await fetchConversations();
    if (res.error) {
      setError(res.error);
      if (!getCachedConversations()) setConversations([]);
    } else {
      const next = sortConversationsByRecent(inboxConversations(res.conversations ?? []));
      setCachedConversations(next);
      setConversations(next);
    }
    setListLoading(false);
  }, []);

  const loadThread = React.useCallback(async (conversationId: string) => {
    hydrateThreadLocally(conversationId);
    setError(null);
    const res = await fetchConversationMessages(conversationId);
    if (selectedIdRef.current !== conversationId) return;

    if (res.error) {
      setError(res.error);
      if (!getCachedThread(conversationId)) {
        setMessages([]);
        setActiveConversation(null);
      }
      setThreadLoading(false);
      return;
    }

    const nextMessages = res.messages ?? [];
    const nextConversation = res.conversation ?? null;
    if (nextConversation) {
      setCachedThread(conversationId, nextMessages, nextConversation);
      setActiveConversation(nextConversation);
    }
    setMessages(nextMessages);
    setThreadLoading(false);

    setConversations((prev) => {
      const cleared = prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
      setCachedConversations(cleared);
      return cleared;
    });
    setCachedUnreadMessagesCount(
      (getCachedConversations() ?? []).reduce((sum, c) => sum + Math.max(0, c.unreadCount || 0), 0),
    );
    void markConversationRead(conversationId);
  }, [hydrateThreadLocally]);

  React.useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  React.useEffect(() => {
    if (pendingHandled.current) return;
    pendingHandled.current = true;

    const pendingReservation = consumePendingBusinessReservation();
    if (pendingReservation) {
      void (async () => {
        const res = await submitBusinessReservationToMessages(pendingReservation);
        if (res.conversationId) {
          router.replace(`${paths.user.messages}?c=${encodeURIComponent(res.conversationId)}`);
          await loadInbox();
        }
      })();
      return;
    }

    const pending = consumePendingListingChat();
    if (!pending) return;
    void (async () => {
      const res = await startConversation(pending.listingKind, pending.listingId);
      if (res.conversation) {
        router.replace(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
        await loadInbox();
      }
    })();
  }, [router, loadInbox]);

  React.useEffect(() => {
    if (!selectedId) {
      setActiveConversation(null);
      setMessages([]);
      if (!urlSelectedId) setMobileThreadDismissed(false);
      return;
    }
    setMobileThreadDismissed(false);
    stickToBottomRef.current = true;
    void loadThread(selectedId);
  }, [selectedId, loadThread, urlSelectedId]);

  const scrollThreadToBottom = React.useCallback(() => {
    const scroller = messagesScrollRef.current;
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, []);

  const pinThreadToBottom = React.useCallback(() => {
    if (!stickToBottomRef.current) return;
    scrollThreadToBottom();
  }, [scrollThreadToBottom]);

  const handleThreadScroll = React.useCallback(() => {
    const scroller = messagesScrollRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  // Jump to latest message when a thread opens or new messages arrive (while pinned).
  // useLayoutEffect + rAF + short timeouts: images / flex layout can grow after first paint.
  React.useLayoutEffect(() => {
    if (!selectedId || !activeConversation) return;
    if (threadLoading && messages.length === 0) return;
    if (!stickToBottomRef.current) return;
    scrollThreadToBottom();
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      pinThreadToBottom();
      raf2 = window.requestAnimationFrame(pinThreadToBottom);
    });
    const t1 = window.setTimeout(pinThreadToBottom, 80);
    const t2 = window.setTimeout(pinThreadToBottom, 250);
    const t3 = window.setTimeout(pinThreadToBottom, 500);
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [messages, threadLoading, selectedId, activeConversation, scrollThreadToBottom, pinThreadToBottom]);

  // Re-pin when message images (or other content) change the thread height.
  React.useEffect(() => {
    if (!selectedId || !activeConversation) return;
    if (threadLoading && messages.length === 0) return;
    const content = messagesContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      pinThreadToBottom();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [threadLoading, selectedId, activeConversation, pinThreadToBottom, messages.length]);

  const discardEmptyConversation = (id: string | null | undefined, conv: ConversationSummary | null) => {
    if (!id || !conv || conversationHasMessages(conv)) return;
    removeCachedThreads([id]);
    void hideConversations([id]);
  };

  const selectConversation = (id: string) => {
    const leavingId = selectedIdRef.current;
    if (leavingId && leavingId !== id) {
      discardEmptyConversation(leavingId, activeConversationRef.current);
    }
    setMobileThreadDismissed(false);
    if (id === selectedId) return;
    // Paint the thread immediately; URL sync can take a tick on mobile.
    setInstantSelectedId(id);
    threadChrome?.setThreadUiOpen(true);
    stickToBottomRef.current = true;
    hydrateThreadLocally(id);
    router.push(`${paths.user.messages}?c=${encodeURIComponent(id)}`);
  };

  const handleBackToInbox = () => {
    const leavingId = selectedIdRef.current;
    const leaving =
      (leavingId && conversationsRef.current.find((c) => c.id === leavingId)) ||
      activeConversationRef.current;
    discardEmptyConversation(leavingId, leaving);
    // Show inbox + bottom nav immediately; URL sync can take a tick on mobile.
    setMobileThreadDismissed(true);
    setInstantSelectedId(null);
    threadChrome?.setThreadUiOpen(false);
    router.replace(paths.user.messages);
  };

  const closeActionMenu = () => {
    setActionMenuAnchor(null);
    setActionConversationId(null);
  };

  const openActionMenu = (
    id: string,
    el: HTMLElement,
    point?: { left: number; top: number },
  ) => {
    setActionConversationId(id);
    setActionMenuAnchor({
      el,
      position: point ? { top: point.top, left: point.left } : undefined,
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (seedId?: string) => {
    closeActionMenu();
    setSelectionMode(true);
    setSelectedIds(seedId ? new Set([seedId]) : new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeConversationsLocally = (ids: string[]) => {
    const idSet = new Set(ids);
    removeCachedThreads(ids);
    setConversations((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      setCachedConversations(next);
      return next;
    });
    if (selectedId && idSet.has(selectedId)) {
      handleBackToInbox();
    }
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => !idSet.has(id)));
      return next;
    });
  };

  const handleTogglePin = async () => {
    if (!actionConversation || pinningChat) return;
    const nextPinned = !actionConversation.pinned;
    closeActionMenu();
    setPinningChat(true);
    const res = await setConversationPinned(actionConversation.id, nextPinned);
    setPinningChat(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setConversations((prev) => {
      const next = sortConversationsByRecent(
        prev.map((c) =>
          c.id === actionConversation.id
            ? { ...c, pinned: res.conversation?.pinned ?? nextPinned }
            : c,
        ),
      );
      setCachedConversations(next);
      return next;
    });
  };

  const requestDeleteIds = (ids: string[]) => {
    closeActionMenu();
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return;
    setPendingDeleteIds(unique);
  };

  const confirmDeleteChats = async () => {
    if (!pendingDeleteIds?.length || deletingChats) return;
    setDeletingChats(true);
    const res = await hideConversations(pendingDeleteIds);
    setDeletingChats(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    removeConversationsLocally(res.ids ?? pendingDeleteIds);
    setPendingDeleteIds(null);
    exitSelectionMode();
  };

  const handleMarkAllRead = async () => {
    if (unreadConversations.length === 0 || markingAllRead) return;
    setMarkingAllRead(true);
    const ids = unreadConversations.map((c) => c.id);
    await Promise.all(ids.map((id) => markConversationRead(id)));
    setConversations((prev) => {
      const next = prev.map((c) => (c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c));
      setCachedConversations(next);
      return next;
    });
    setCachedUnreadMessagesCount(0);
    setMarkingAllRead(false);
  };

  const handleSend = async (body: string, file?: File | null): Promise<boolean> => {
    if (!selectedId || (!body && !file)) return false;
    setError(null);

    const conversationId = selectedId;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const createdAt = new Date().toISOString();
    const localPreviewUrl = file ? URL.createObjectURL(file) : null;
    const preview = body.trim() || (file ? t.messages.photoPreview : body);
    const wasInInbox = conversationsRef.current.some((c) => c.id === conversationId);
    const baseOtherUnread =
      conversationsRef.current.find((c) => c.id === conversationId)?.otherUnreadCount ??
      activeConversationRef.current?.otherUnreadCount ??
      0;

    const optimistic: ConversationMessage = {
      id: tempId,
      conversationId,
      senderId: 'me',
      senderModel: 'IndividualUser',
      body,
      imageUrl: localPreviewUrl,
      createdAt,
      isMine: true,
    };

    stickToBottomRef.current = true;
    setMessages((prev) => {
      const next = [...prev, optimistic];
      const conv = activeConversationRef.current;
      if (conv) {
        setCachedThread(conversationId, next, {
          ...conv,
          otherUnreadCount: baseOtherUnread + 1,
        });
      }
      return next;
    });
    setActiveConversation((prev) =>
      prev ? { ...prev, otherUnreadCount: baseOtherUnread + 1 } : prev,
    );
    setConversations((prev) => {
      const next = sortConversationsByRecent(
        patchConversationInList(
          prev,
          conversationId,
          {
            lastMessageText: preview,
            lastMessageAt: createdAt,
            lastMessageIsMine: true,
            otherUnreadCount: baseOtherUnread + 1,
          },
          activeConversationRef.current,
        ),
      );
      setCachedConversations(next);
      return next;
    });

    const rollback = () => {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setActiveConversation((prev) =>
        prev ? { ...prev, otherUnreadCount: baseOtherUnread } : prev,
      );
      setConversations((prev) => {
        if (!wasInInbox) {
          const next = prev.filter((c) => c.id !== conversationId);
          setCachedConversations(next);
          return next;
        }
        const next = prev.map((c) =>
          c.id === conversationId ? { ...c, otherUnreadCount: baseOtherUnread } : c,
        );
        setCachedConversations(next);
        return next;
      });
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };

    let imageUrl: string | undefined;
    if (file) {
      const up = await uploadListingImages([file], 'messages');
      if (up.error || !up.urls[0]) {
        rollback();
        setError(up.error ?? t.messages.uploadFailed);
        return false;
      }
      imageUrl = up.urls[0];
    }

    const res = await sendConversationMessage(conversationId, body, imageUrl);
    if (res.error || !res.message) {
      rollback();
      setError(res.error ?? t.messages.sendFailed);
      return false;
    }

    const sent = res.message;
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === tempId ? sent : m));
      const conv = activeConversation;
      if (conv) setCachedThread(conversationId, next, conv);
      return next;
    });
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setConversations((prev) => {
      const next = sortConversationsByRecent(
        patchConversationInList(
          prev,
          conversationId,
          {
            lastMessageText:
              sent.body?.trim() || (sent.imageUrl ? t.messages.photoPreview : sent.body),
            lastMessageAt: sent.createdAt,
            lastMessageIsMine: true,
          },
          activeConversationRef.current,
        ),
      );
      setCachedConversations(next);
      return next;
    });
    return true;
  };

  const showThreadOnMobile = Boolean(selectedId);
  const contactPhone = activeConversation ? conversationContactPhone(activeConversation) : null;
  const showListingInHeader = Boolean(
    activeConversation &&
      !isPersonFocusedConversation(activeConversation) &&
      activeConversation.listingTitle?.trim(),
  );
  const activeListingHref =
    showListingInHeader && activeConversation
      ? listingPublicHref(activeConversation.listingKind, activeConversation.listingId)
      : null;
  const threadHeaderName =
    activeConversation?.otherParticipantName?.trim() || t.messages.userFallback;
  const contactWhatsapp = whatsappInquireHref(
    contactPhone,
    t.messages.whatsappIntro(
      showListingInHeader && activeConversation ? activeConversation.listingTitle : threadHeaderName,
      toAbsoluteSiteUrl(activeListingHref),
    ),
  );
  const threadHeaderAvatar = showListingInHeader
    ? activeConversation?.listingImageUrl
    : activeConversation?.otherParticipantAvatarUrl;
  const deliveryStatuses = React.useMemo(
    () => deliveryStatusByMessageId(messages, activeConversation?.otherUnreadCount ?? 0),
    [messages, activeConversation?.otherUnreadCount],
  );

  return (
    <Stack
      spacing={{ xs: 0, md: 2 }}
      sx={{
        flex: { xs: '1 1 auto', md: '0 1 auto' },
        minHeight: 0,
        height: { xs: '100%', md: 'auto' },
      }}
    >
      <UserPageHeader
        icon={<ChatsCircleIcon size={20} weight="duotone" />}
        title={t.messages.title}
        description={t.messages.description}
        sx={{
          display: { xs: showThreadOnMobile ? 'none' : 'flex', md: 'flex' },
          px: { xs: 2, md: 0 },
          pt: { xs: 1.25, md: 0 },
          pb: { xs: 0.75, md: 0 },
          // Mobile: title only; keep description on desktop.
          '& .MuiTypography-body2': { display: { xs: 'none', md: 'block' } },
          '& > .MuiBox-root': { display: { xs: 'none', md: 'inline-flex' } },
          '& .MuiTypography-h5': {
            fontSize: { xs: '1.65rem', md: undefined },
            fontWeight: { xs: 700, md: 800 },
          },
        }}
      />

      {error && !showThreadOnMobile ? (
        <Alert severity="error" sx={{ mx: { xs: 2, md: 0 }, mb: { xs: 1.5, md: 0 } }}>
          {error}
        </Alert>
      ) : null}

      <Card
        elevation={0}
        sx={{
          border: { xs: 'none', md: '1px solid' },
          borderColor: { md: 'divider' },
          borderRadius: { xs: 0, md: 2 },
          overflow: 'hidden',
          flex: { xs: '1 1 auto', md: '0 1 auto' },
          minHeight: { xs: 0, md: 560 },
          height: { xs: '100%', md: 'auto' },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          bgcolor: 'background.default',
        }}
      >
        <Box
          sx={{
            width: { xs: '100%', md: 340 },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderColor: 'divider',
            display: { xs: showThreadOnMobile ? 'none' : 'flex', md: 'flex' },
            flexDirection: 'column',
            minHeight: 0,
            flex: { xs: '1 1 auto', md: '0 0 auto' },
          }}
        >
          <Stack
            spacing={1}
            sx={{
              px: { xs: 2, md: 1.5 },
              pt: { xs: 0.25, md: 1.25 },
              pb: 1,
              flexShrink: 0,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                display: unreadTotal > 0 ? 'flex' : { xs: 'none', md: 'flex' },
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', display: { xs: 'none', md: 'block' } }}>
                {t.messages.chats}
              </Typography>
              {unreadTotal > 0 ? (
                <Button
                  type="button"
                  size="small"
                  onClick={() => void handleMarkAllRead()}
                  disabled={markingAllRead}
                  sx={{
                    ml: { xs: 'auto', md: 0 },
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    minWidth: 0,
                    px: 0.5,
                    color: 'primary.main',
                  }}
                >
                  {markingAllRead ? t.common.markingRead : t.common.markAllRead}
                </Button>
              ) : null}
            </Stack>

            {conversations.length > 0 ? (
              selectionMode ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 40, gap: 1 }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'text.primary',
                      minWidth: 0,
                    }}
                  >
                    {t.messages.selectedCount(selectedCount)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Button
                      type="button"
                      size="small"
                      color="error"
                      disabled={selectedCount === 0 || deletingChats}
                      startIcon={<TrashIcon size={14} weight="bold" />}
                      onClick={() => requestDeleteIds([...selectedIds])}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        minWidth: 0,
                        px: 0.75,
                      }}
                    >
                      {t.messages.deleteChats(selectedCount || 1)}
                    </Button>
                    <Button
                      type="button"
                      size="small"
                      onClick={exitSelectionMode}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        minWidth: 0,
                        px: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      {t.common.cancel}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
              <Stack
                direction="row"
                spacing={1}
                role="tablist"
                aria-label={t.messages.filterAria}
                sx={{ overflowX: 'auto', pb: 0.25, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
              >
                {inboxTabs.map((tab) => {
                  const selected = inboxFilter === tab.id;
                  return (
                    <Box
                      key={tab.id}
                      component="button"
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setInboxFilter(tab.id)}
                      sx={{
                        m: 0,
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.55,
                        border: '1px solid',
                        borderColor: selected
                          ? 'primary.main'
                          : (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
                        borderRadius: 999,
                        cursor: 'pointer',
                        font: 'inherit',
                        WebkitTapHighlightColor: 'transparent',
                        bgcolor: selected ? primaryMainAlpha(0.18) : 'transparent',
                        color: selected ? 'primary.main' : 'text.secondary',
                        transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                        '&:hover': {
                          borderColor: selected
                            ? 'primary.main'
                            : (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
                          color: selected ? 'primary.main' : 'text.primary',
                        },
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          fontWeight: selected ? 700 : 500,
                          fontSize: '0.8125rem',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {inboxFilterLabels[tab.id]}
                      </Typography>
                      {tab.count > 0 ? (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: selected ? 700 : 500,
                            lineHeight: 1,
                            opacity: 0.9,
                          }}
                        >
                          {tab.count > 99 ? '99+' : tab.count}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
              )
            ) : null}
          </Stack>

          {listLoading ? (
            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : conversations.length === 0 ? (
            <Stack
              spacing={1.25}
              sx={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                px: 3,
                py: 5,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: primaryMainAlpha(0.12),
                  color: 'primary.main',
                  mb: 0.5,
                }}
              >
                <ChatsCircleIcon size={28} weight="duotone" />
              </Box>
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{t.messages.emptyTitle}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, lineHeight: 1.5 }}>
                {t.messages.emptyBody}
              </Typography>
            </Stack>
          ) : filteredConversations.length === 0 ? (
            <Stack
              spacing={1}
              sx={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                px: 3,
                py: 5,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
                {inboxFilter === 'unread'
                  ? t.messages.emptyUnread
                  : inboxFilter === 'reservations'
                    ? t.messages.emptyReservations
                    : t.messages.emptyTitle}
              </Typography>
              <Button
                type="button"
                size="small"
                onClick={() => setInboxFilter('all')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {t.common.showAll}
              </Button>
            </Stack>
          ) : (
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                pb: { xs: 10, md: 0 },
                position: 'relative',
              }}
            >
              {filteredConversations.map((item, index) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
                  isLast={index === filteredConversations.length - 1}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onOpen={selectConversation}
                  onToggleSelect={toggleSelected}
                  onOpenActions={openActionMenu}
                />
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: { xs: showThreadOnMobile ? 'flex' : 'none', md: 'flex' },
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            height: { xs: '100%', md: 'auto' },
          }}
        >
          {!selectedId ? (
            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', px: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">{t.messages.pickConversation}</Typography>
            </Stack>
          ) : threadLoading && !activeConversation ? (
            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Stack>
          ) : activeConversation ? (
            <>
              {error ? (
                <Alert severity="error" sx={{ borderRadius: 0 }}>
                  {error}
                </Alert>
              ) : null}
              <Stack
                direction="row"
                spacing={1.1}
                sx={{
                  position: 'relative',
                  zIndex: 2,
                  alignItems: 'center',
                  px: { xs: 1.25, md: 1.5 },
                  py: 1.25,
                  minHeight: 64,
                  flexShrink: 0,
                  bgcolor: 'background.paper',
                }}
              >
                <ProductBackButton
                  type="button"
                  onClick={handleBackToInbox}
                  sx={{
                    display: { xs: 'inline-flex', md: 'none' },
                    position: 'relative',
                    zIndex: 3,
                    pointerEvents: 'auto',
                    width: 40,
                    height: 40,
                    '& svg': { width: 20, height: 20 },
                  }}
                  aria-label={t.messages.backAria}
                />
                <Avatar
                  src={threadHeaderAvatar ?? undefined}
                  variant={showListingInHeader ? 'rounded' : 'circular'}
                  sx={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: showListingInHeader ? 1.85 : '50%',
                    fontWeight: 800,
                    fontSize: '1rem',
                    ...(threadHeaderAvatar
                      ? {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.06)',
                        }
                      : {
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                        }),
                  }}
                >
                  {threadHeaderName.slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack
                  spacing={0.2}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    justifyContent: 'center',
                    alignSelf: 'stretch',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '1.025rem',
                      lineHeight: 1.25,
                      letterSpacing: '-0.01em',
                      color: 'text.primary',
                    }}
                    noWrap
                  >
                    {threadHeaderName}
                  </Typography>
                  {showListingInHeader ? (
                    <Typography
                      component={activeListingHref ? Link : 'span'}
                      href={activeListingHref || undefined}
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        color: activeListingHref ? CHAT_ACCENT : 'text.secondary',
                        textDecoration: 'none',
                        lineHeight: 1.2,
                        ...(activeListingHref
                          ? { '&:hover': { textDecoration: 'underline' } }
                          : null),
                      }}
                      noWrap
                    >
                      {activeConversation.listingTitle}
                    </Typography>
                  ) : null}
                </Stack>
                {contactPhone ? (
                  <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                    <IconButton
                      component="a"
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      aria-label={t.messages.phoneAria}
                      sx={{ color: CHAT_ACCENT, width: 40, height: 40 }}
                    >
                      <ChatCallIcon size={26} />
                    </IconButton>
                    {contactWhatsapp ? (
                      <IconButton
                        component="a"
                        href={contactWhatsapp}
                        rel="noopener noreferrer"
                        target="_blank"
                        aria-label="WhatsApp"
                        sx={{ color: '#25D366', width: 40, height: 40 }}
                      >
                        <ChatWhatsappIcon size={26} />
                      </IconButton>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  ref={messagesScrollRef}
                  onScroll={handleThreadScroll}
                  sx={{
                    flex: 1,
                    overflow: 'auto',
                    pt: 1.5,
                    pb: {
                      xs: 'max(88px, calc(72px + env(safe-area-inset-bottom)))',
                      md: 11,
                    },
                    minHeight: 0,
                    bgcolor: 'transparent',
                  }}
                >
                  <Box ref={messagesContentRef}>
                    {threadLoading && messages.length === 0 ? (
                      <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={24} />
                      </Stack>
                    ) : messages.length === 0 ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 3 }}>
                        <Typography
                          sx={{
                            textAlign: 'center',
                            px: 2,
                            py: 1,
                            borderRadius: 2.25,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            color: 'text.secondary',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            maxWidth: 320,
                          }}
                        >
                          {t.messages.startChat}
                        </Typography>
                      </Box>
                    ) : (
                      messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          deliveryStatus={m.isMine ? deliveryStatuses.get(m.id) : undefined}
                          onMediaLoad={pinThreadToBottom}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </Box>
                </Box>

                <MessageComposer onSend={handleSend} />
              </Box>            </>
          ) : null}
        </Box>
      </Card>

      <Menu
        open={Boolean(actionMenuAnchor)}
        anchorEl={actionMenuAnchor?.el ?? null}
        onClose={closeActionMenu}
        anchorReference={actionMenuAnchor?.position ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={
          actionMenuAnchor?.position
            ? { top: actionMenuAnchor.position.top, left: actionMenuAnchor.position.left }
            : undefined
        }
        slotProps={{
          paper: {
            sx: {
              minWidth: 200,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
          list: {
            'aria-label': t.messages.actionsAria,
            dense: true,
          },
        }}
      >
        <MenuItem
          disabled={pinningChat}
          onClick={() => {
            void handleTogglePin();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
            <PushPinIcon size={18} weight={actionConversation?.pinned ? 'fill' : 'regular'} />
          </ListItemIcon>
          <ListItemText primary={actionConversation?.pinned ? t.messages.unpin : t.messages.pin} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionConversationId) enterSelectionMode(actionConversationId);
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
            <CheckSquareIcon size={18} weight="regular" />
          </ListItemIcon>
          <ListItemText primary={t.messages.select} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (actionConversationId) requestDeleteIds([actionConversationId]);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <TrashIcon size={18} weight="regular" />
          </ListItemIcon>
          <ListItemText primary={t.messages.deleteChat} />
        </MenuItem>
      </Menu>

      <ProductDialog
        open={Boolean(pendingDeleteIds?.length)}
        onClose={deletingChats ? undefined : () => setPendingDeleteIds(null)}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={deletingChats ? undefined : () => setPendingDeleteIds(null)}>
          {(pendingDeleteIds?.length ?? 0) > 1
            ? t.messages.deleteConfirmManyTitle(pendingDeleteIds!.length)
            : t.messages.deleteConfirmTitle}
        </ProductDialogTitle>
        <ProductDialogContent>
          <DialogContentText sx={{ m: 0, color: 'text.secondary' }}>
            {(pendingDeleteIds?.length ?? 0) > 1
              ? t.messages.deleteConfirmManyBody
              : t.messages.deleteConfirmBody}
          </DialogContentText>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            onClick={() => setPendingDeleteIds(null)}
            disabled={deletingChats}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t.common.cancel}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deletingChats}
            onClick={() => void confirmDeleteChats()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deletingChats ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              t.messages.deleteChats(pendingDeleteIds?.length ?? 1)
            )}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
