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
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { WhatsappLogo as WhatsappLogoIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
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

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('sq-AL', {
    hour: '2-digit',
    minute: '2-digit',
  });
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
  onSelect,
}: {
  item: ConversationSummary;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Button
      type="button"
      onClick={() => onSelect(item.id)}
      fullWidth
      sx={{
        justifyContent: 'flex-start',
        textAlign: 'left',
        textTransform: 'none',
        px: 2,
        py: 1.5,
        borderRadius: 0,
        bgcolor: active ? 'action.selected' : 'transparent',
        '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ width: '100%', alignItems: 'center', minWidth: 0 }}>
        <Avatar
          src={item.listingImageUrl ?? undefined}
          variant="rounded"
          sx={{ width: 48, height: 48, flexShrink: 0 }}
        >
          {item.listingTitle.slice(0, 1).toUpperCase()}
        </Avatar>
        <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }} noWrap>
              {item.otherParticipantName ?? 'Përdorues'}
            </Typography>
            {item.unreadCount > 0 ? (
              <Box
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  borderRadius: 999,
                  px: 0.85,
                  py: 0.15,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {item.unreadCount}
              </Box>
            ) : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600 }}>
            {item.listingTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {item.lastMessageText || 'Nuk ka mesazhe ende'}
          </Typography>
        </Stack>
      </Stack>
    </Button>
  );
}

function MessageBubble({
  message,
  chrome,
}: {
  message: ConversationMessage;
  chrome: ReturnType<typeof useChatChrome>;
}) {
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
          {formatMessageTime(message.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export function UserMessagesView() {
  const chrome = useChatChrome();
  const { setMode } = useColorScheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('c');

  React.useEffect(() => {
    setMode('dark');
  }, [setMode]);

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [messages, setMessages] = React.useState<ConversationMessage[]>([]);
  const [activeConversation, setActiveConversation] = React.useState<ConversationSummary | null>(null);
  const [listLoading, setListLoading] = React.useState(true);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const pendingHandled = React.useRef(false);

  const loadInbox = React.useCallback(async () => {
    setListLoading(true);
    const res = await fetchConversations();
    if (res.error) {
      setError(res.error);
      setConversations([]);
    } else {
      setConversations(res.conversations ?? []);
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
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                lastMessageText: res.message!.body,
                lastMessageAt: res.message!.createdAt,
              }
            : c,
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
        title="Mesazhet"
        description="Bisedoni me shitësit dhe blerësit përmes njoftimeve tuaja."
        sx={{
          display: { xs: showThreadOnMobile ? 'none' : 'flex', md: 'flex' },
          px: { xs: 2, md: 0 },
          pt: { xs: 2, md: 0 },
          pb: { xs: 1.5, md: 0 },
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
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>Bisedat</Typography>
          </Box>
          {listLoading ? (
            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : conversations.length === 0 ? (
            <Stack sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', px: 3, py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nuk keni biseda ende. Hapni një njoftim dhe prekni &quot;Dërgo mesazh&quot; për të filluar.
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {conversations.map((item) => (
                <ConversationListItem
                  key={item.id}
                  item={item}
                  active={item.id === selectedId}
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
              <Typography color="text.secondary">Zgjidhni një bisedë për të vazhduar.</Typography>
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
                <IconButton
                  type="button"
                  onClick={() => router.push(paths.user.messages)}
                  sx={{ display: { xs: 'inline-flex', md: 'none' }, color: chrome.text, p: 0.75 }}
                  aria-label="Kthehu te lista"
                >
                  <ArrowLeftIcon size={22} weight="bold" />
                </IconButton>
                <Avatar
                  src={activeConversation.listingImageUrl ?? undefined}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                >
                  {(activeConversation.otherParticipantName ?? 'P').slice(0, 1).toUpperCase()}
                </Avatar>
                <Stack spacing={0.1} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.25, color: chrome.text }} noWrap>
                    {activeConversation.otherParticipantName ?? 'Përdorues'}
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
                      aria-label="Telefono"
                      sx={{ color: chrome.action }}
                    >
                      <PhoneIcon size={22} weight="regular" />
                    </IconButton>
                    {contactWhatsapp ? (
                      <IconButton
                        component="a"
                        href={`${contactWhatsapp}?text=${encodeURIComponent(`Përshëndetje, jam i interesuari për: «${activeConversation.listingTitle}».`)}`}
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
                      Filloni bisedën — shkruani mesazhin e parë më poshtë.
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
                  placeholder="Shkruani mesazhin…"
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
                  aria-label="Dërgo mesazhin"
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
