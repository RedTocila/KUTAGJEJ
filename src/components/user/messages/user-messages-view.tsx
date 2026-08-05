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
  IconButton,
  Stack,
  TextField,
  Typography,
  useColorScheme,
  useTheme,
} from '@mui/material';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import {
  consumePendingListingChat,
  fetchConversationMessages,
  fetchConversations,
  markConversationRead,
  sendConversationMessage,
  startConversation,
  type ConversationMessage,
  type ConversationSummary,
} from '@/lib/conversations-client';
import {
  consumePendingBusinessReservation,
  submitBusinessReservationToMessages,
} from '@/lib/business-reservation-message';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { languageHtmlLang } from '@/lib/language';
import { whatsappHref } from '@/lib/listing-contact';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';

function conversationContactPhone(conv: ConversationSummary): string | null {
  const listingPhone = conv.listingContactPhone?.trim() || '';
  const otherPhone = conv.otherParticipantPhone?.trim() || '';
  if (conv.role === 'inquirer') return listingPhone || otherPhone || null;
  return otherPhone || listingPhone || null;
}

function listingPublicHref(kind: ConversationSummary['listingKind'], listingId: string): string {
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

function formatMessageTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
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
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  if (dayDiff === 1) return yesterday;
  if (dayDiff < 7) {
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

type InboxFilter = 'all' | 'unread' | 'read';

function conversationActivityAt(item: ConversationSummary): number {
  const raw = item.lastMessageAt || item.updatedAt;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortConversationsByRecent(items: ConversationSummary[]): ConversationSummary[] {
  return [...items].sort((a, b) => conversationActivityAt(b) - conversationActivityAt(a));
}

function filterConversations(items: ConversationSummary[], filter: InboxFilter): ConversationSummary[] {
  if (filter === 'unread') return items.filter((c) => c.unreadCount > 0);
  if (filter === 'read') return items.filter((c) => c.unreadCount <= 0);
  return items;
}

/** Always dark chat chrome — readable WhatsApp-like layout with brand colors. */
function useChatChrome() {
  const theme = useTheme();
  return {
    header: '#171717',
    wallpaper: '#0a0a0a',
    wallpaperPattern: 'rgba(255,255,255,0.035)',
    bubbleOut: theme.palette.primary.main,
    bubbleOutText: theme.palette.primary.contrastText || '#0a0a0a',
    bubbleIn: '#262626',
    bubbleInText: '#fafafa',
    composer: '#171717',
    input: '#262626',
    inputText: '#fafafa',
    inputPlaceholder: 'rgba(250,250,250,0.45)',
    send: theme.palette.primary.main,
    sendIcon: theme.palette.primary.contrastText || '#0a0a0a',
    timeOut: 'rgba(0,0,0,0.55)',
    timeIn: 'rgba(250,250,250,0.55)',
    emptyChip: 'rgba(23,23,23,0.92)',
    text: '#fafafa',
    textMuted: '#d4d4d4',
    action: theme.palette.primary.main,
    whatsapp: '#25D366',
    divider: '#404040',
  };
}

function ConversationListItem({
  item,
  active,
  isLast,
  onSelect,
}: {
  item: ConversationSummary;
  active: boolean;
  isLast?: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const locale = languageHtmlLang(language);
  const unread = item.unreadCount > 0;
  const timeLabel = formatConversationListTime(
    item.lastMessageAt || item.updatedAt,
    locale,
    t.messages.yesterday,
  );
  const preview = item.lastMessageText || t.messages.noMessagesYet;
  const subtitle = item.listingTitle
    ? `${item.listingTitle} · ${preview}`
    : preview;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'true' : undefined}
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
        bgcolor: (t) =>
          active
            ? t.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.05)'
            : 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background-color 0.12s ease',
        '&:hover': {
          bgcolor: (t) =>
            t.palette.mode === 'dark'
              ? active
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(255,255,255,0.04)'
              : active
                ? 'rgba(0,0,0,0.06)'
                : 'rgba(0,0,0,0.03)',
        },
        '&:active': {
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        },
      }}
    >
      <Avatar
        src={item.listingImageUrl ?? undefined}
        variant="rounded"
        sx={{
          width: 49,
          height: 49,
          flexShrink: 0,
          my: 1.15,
          borderRadius: 1.5,
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '1.1rem',
        }}
      >
        {(item.otherParticipantName || item.listingTitle || 'P').slice(0, 1).toUpperCase()}
      </Avatar>

      <Stack
        spacing={0.2}
        sx={{
          flex: 1,
          minWidth: 0,
          py: 1.35,
          borderBottom: isLast ? 'none' : '1px solid',
          borderColor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
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
            {item.otherParticipantName ?? t.messages.userFallback}
          </Typography>
          {timeLabel ? (
            <Typography
              sx={{
                flexShrink: 0,
                fontSize: '0.75rem',
                fontWeight: unread ? 600 : 400,
                color: unread ? 'primary.main' : 'text.secondary',
                lineHeight: 1.2,
                ml: 1,
              }}
            >
              {timeLabel}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 22 }}>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.875rem',
              fontWeight: unread ? 500 : 400,
              lineHeight: 1.35,
              color: 'text.secondary',
            }}
            noWrap
          >
            {subtitle}
          </Typography>
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
  chrome,
}: {
  message: ConversationMessage;
  chrome: ReturnType<typeof useChatChrome>;
}) {
  const { language } = useLanguage();
  const locale = languageHtmlLang(language);
  const mine = message.isMine;
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: mine ? 'flex-end' : 'flex-start',
        px: 1.25,
        py: 0.2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: '78%',
          px: 1.1,
          pt: 0.55,
          pb: 0.4,
          bgcolor: mine ? chrome.bubbleOut : chrome.bubbleIn,
          color: mine ? chrome.bubbleOutText : chrome.bubbleInText,
          borderRadius: mine ? '8px 0 8px 8px' : '0 8px 8px 8px',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            width: 8,
            height: 13,
            ...(mine
              ? {
                  right: -7,
                  bgcolor: chrome.bubbleOut,
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                }
              : {
                  left: -7,
                  bgcolor: chrome.bubbleIn,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                }),
          },
        }}
      >
        <Typography
          variant="body2"
          component="span"
          sx={{
            display: 'inline',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.9375rem',
            lineHeight: 1.35,
          }}
        >
          {message.body}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: 'inline-block',
            float: 'right',
            position: 'relative',
            top: 6,
            ml: 1.25,
            mb: -0.15,
            fontSize: '0.68rem',
            lineHeight: 1,
            color: mine ? chrome.timeOut : chrome.timeIn,
            whiteSpace: 'nowrap',
          }}
        >
          {formatMessageTime(message.createdAt, locale)}
        </Typography>
      </Box>
    </Box>
  );
}

export function UserMessagesView() {
  const chrome = useChatChrome();
  const t = useCopy();
  const { setMode } = useColorScheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('c');

  const inboxFilterLabels: Record<InboxFilter, string> = {
    all: t.messages.all,
    unread: t.messages.unread,
    read: t.messages.read,
  };

  React.useEffect(() => {
    setMode('dark');
  }, [setMode]);

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [activeConversation, setActiveConversation] = React.useState<ConversationSummary | null>(null);
  const [inboxFilter, setInboxFilter] = React.useState<InboxFilter>('all');
  const [listLoading, setListLoading] = React.useState(true);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [markingAllRead, setMarkingAllRead] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const pendingHandled = React.useRef(false);

  const unreadConversations = React.useMemo(
    () => conversations.filter((c) => c.unreadCount > 0),
    [conversations],
  );
  const unreadTotal = unreadConversations.length;
  const readTotal = conversations.length - unreadTotal;
  const filteredConversations = React.useMemo(
    () => filterConversations(conversations, inboxFilter),
    [conversations, inboxFilter],
  );

  const loadInbox = React.useCallback(async () => {
    setListLoading(true);
    const res = await fetchConversations();
    if (res.error) {
      setError(res.error);
      setConversations([]);
    } else {
      setConversations(sortConversationsByRecent(res.conversations ?? []));
    }
    setListLoading(false);
  }, []);

  const loadThread = React.useCallback(async (conversationId: string) => {
    setThreadLoading(true);
    setError(null);
    const res = await fetchConversationMessages(conversationId);
    if (res.error) {
      setError(res.error);
      setMessages([]);
      setActiveConversation(null);
    } else {
      setMessages(res.messages ?? []);
      setActiveConversation(res.conversation ?? null);
      await markConversationRead(conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    }
    setThreadLoading(false);
  }, []);

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
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (id: string) => {
    router.push(`${paths.user.messages}?c=${encodeURIComponent(id)}`);
  };

  const handleMarkAllRead = async () => {
    if (unreadConversations.length === 0 || markingAllRead) return;
    setMarkingAllRead(true);
    const ids = unreadConversations.map((c) => c.id);
    await Promise.all(ids.map((id) => markConversationRead(id)));
    setConversations((prev) => prev.map((c) => (c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c)));
    setMarkingAllRead(false);
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!selectedId || !body) return;
    setSending(true);
    const res = await sendConversationMessage(selectedId, body);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.message) {
      setMessages((prev) => [...prev, res.message!]);
      setDraft('');
      setConversations((prev) =>
        sortConversationsByRecent(
          prev.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  lastMessageText: res.message!.body,
                  lastMessageAt: res.message!.createdAt,
                }
              : c,
          ),
        ),
      );
    }
  };

  const showThreadOnMobile = Boolean(selectedId);
  const contactPhone = activeConversation ? conversationContactPhone(activeConversation) : null;
  const contactWhatsapp = whatsappHref(contactPhone);

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
          // WhatsApp-style: title only on mobile; keep description on desktop.
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
              <Stack
                direction="row"
                spacing={1}
                role="tablist"
                aria-label={t.messages.filterAria}
                sx={{ overflowX: 'auto', pb: 0.25, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
              >
                {(
                  [
                    { id: 'all' as const, count: conversations.length },
                    { id: 'unread' as const, count: unreadTotal },
                    { id: 'read' as const, count: readTotal },
                  ] as const
                ).map((tab) => {
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
                          : (t) =>
                              t.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
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
                            : (t) =>
                                t.palette.mode === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)',
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
                {inboxFilter === 'unread' ? t.messages.emptyUnread : t.messages.emptyRead}
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
              }}
            >
              {filteredConversations.map((item, index) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
                  isLast={index === filteredConversations.length - 1}
                  onSelect={selectConversation}
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
          ) : threadLoading ? (
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
                spacing={1}
                sx={{
                  alignItems: 'center',
                  px: 1,
                  py: 0.85,
                  flexShrink: 0,
                  bgcolor: chrome.header,
                  borderBottom: '1px solid',
                  borderColor: chrome.divider,
                  color: chrome.text,
                }}
              >
                <ProductBackButton
                  onClick={() => router.push(paths.user.messages)}
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  aria-label={t.messages.backAria}
                />
                <Avatar
                  src={activeConversation.listingImageUrl ?? undefined}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                >
                  {(activeConversation.otherParticipantName ?? 'P').slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack spacing={0.1} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.25, color: chrome.text }} noWrap>
                    {activeConversation.otherParticipantName ?? t.messages.userFallback}
                  </Typography>
                  <Typography
                    component={Link}
                    href={listingPublicHref(activeConversation.listingKind, activeConversation.listingId)}
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: chrome.action,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                    noWrap
                  >
                    {activeConversation.listingTitle}
                  </Typography>
                </Stack>
                {contactPhone ? (
                  <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                    <IconButton
                      component="a"
                      href={`tel:${contactPhone.replace(/\s/g, '')}`}
                      aria-label={t.messages.phoneAria}
                      sx={{ color: chrome.action }}
                    >
                      <PhoneIcon size={22} weight="regular" />
                    </IconButton>
                    {contactWhatsapp ? (
                      <IconButton
                        component="a"
                        href={`${contactWhatsapp}?text=${encodeURIComponent(t.messages.whatsappIntro(activeConversation.listingTitle))}`}
                        rel="noopener noreferrer"
                        target="_blank"
                        aria-label="WhatsApp"
                        sx={{ color: chrome.whatsapp }}
                      >
                        <WhatsappLogoIcon size={22} weight="regular" />
                      </IconButton>
                    ) : null}
                  </Stack>
                ) : null}
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  py: 1.25,
                  minHeight: 0,
                  bgcolor: chrome.wallpaper,
                  backgroundImage: `radial-gradient(${chrome.wallpaperPattern} 1.2px, transparent 1.2px)`,
                  backgroundSize: '18px 18px',
                }}
              >
                {messages.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 3 }}>
                    <Typography
                      sx={{
                        textAlign: 'center',
                        px: 2,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: chrome.emptyChip,
                        color: chrome.textMuted,
                        fontSize: '0.8rem',
                        maxWidth: 320,
                        boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
                      }}
                    >
                      {t.messages.startChat}
                    </Typography>
                  </Box>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} message={m} chrome={chrome} />)
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  px: 1,
                  pt: 0.65,
                  alignItems: 'center',
                  flexShrink: 0,
                  bgcolor: chrome.composer,
                  borderTop: '1px solid',
                  borderColor: chrome.divider,
                  pb: { xs: 'max(8px, env(safe-area-inset-bottom))', md: 0.85 },
                }}
              >
                <TextField
                  fullWidth
                  multiline
                  maxRows={5}
                  placeholder={t.messages.placeholder}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: chrome.input,
                      color: chrome.inputText,
                      borderRadius: 999,
                      minHeight: 36,
                      alignItems: 'center',
                      py: 0.25,
                      px: 1.25,
                      fontSize: '0.9rem',
                      '& fieldset': { border: 'none' },
                      '&.Mui-focused fieldset': { border: 'none' },
                    },
                    '& .MuiInputBase-input': {
                      color: chrome.inputText,
                      py: 0.65,
                      lineHeight: 1.35,
                      '&::placeholder': {
                        color: chrome.inputPlaceholder,
                        opacity: 1,
                      },
                    },
                  }}
                />
                <IconButton
                  type="button"
                  disabled={sending || !draft.trim()}
                  onClick={() => void handleSend()}
                  aria-label={t.messages.sendAria}
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    bgcolor: chrome.send,
                    color: chrome.sendIcon,
                    '&:hover': { bgcolor: 'primary.dark' },
                    '&.Mui-disabled': {
                      bgcolor: chrome.send,
                      color: chrome.sendIcon,
                      opacity: 0.45,
                    },
                  }}
                >
                  {sending ? (
                    <CircularProgress size={16} sx={{ color: chrome.sendIcon }} />
                  ) : (
                    <PaperPlaneTiltIcon size={18} weight="fill" />
                  )}
                </IconButton>
              </Stack>
            </>
          ) : null}
        </Box>
      </Card>
    </Stack>
  );
}
