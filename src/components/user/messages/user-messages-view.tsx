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
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';

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
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';

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
  return d.toLocaleString('sq-AL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function MessageBubble({ message }: { message: ConversationMessage }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: message.isMine ? 'flex-end' : 'flex-start',
        px: 2,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          maxWidth: '78%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: message.isMine ? 'primary.main' : 'action.hover',
          color: message.isMine ? 'primary.contrastText' : 'text.primary',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.body}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.5,
            opacity: 0.75,
            textAlign: message.isMine ? 'right' : 'left',
          }}
        >
          {formatMessageTime(message.createdAt)}
        </Typography>
      </Box>
    </Box>
  );
}

export function UserMessagesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('c');

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

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ChatsCircleIcon size={28} weight="duotone" />
        <Stack spacing={0.25}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Mesazhet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bisedoni me shitësit dhe blerësit përmes njoftimeve tuaja.
          </Typography>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          minHeight: { xs: 480, md: 560 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
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
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
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
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  px: 1.5,
                  py: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <IconButton
                  type="button"
                  onClick={() => router.push(paths.user.messages)}
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  aria-label="Kthehu te lista"
                >
                  <ArrowLeftIcon size={20} />
                </IconButton>
                <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
                    {activeConversation.otherParticipantName ?? 'Përdorues'}
                  </Typography>
                  <Typography
                    component={Link}
                    href={listingPublicHref(activeConversation.listingKind, activeConversation.listingId)}
                    variant="caption"
                    color="primary"
                    sx={{ fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    noWrap
                  >
                    {activeConversation.listingTitle}
                  </Typography>
                </Stack>
              </Stack>

              <Box sx={{ flex: 1, overflow: 'auto', py: 1.5 }}>
                {messages.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4, px: 2 }}>
                    Filloni bisedën — shkruani mesazhin e parë më poshtë.
                  </Typography>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} message={m} />)
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Divider />
              <Stack direction="row" spacing={1} sx={{ p: 1.5, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
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
                />
                <IconButton
                  type="button"
                  color="primary"
                  disabled={sending || !draft.trim()}
                  onClick={() => void handleSend()}
                  aria-label="Dërgo mesazhin"
                  sx={{ mb: 0.25 }}
                >
                  {sending ? <CircularProgress size={22} /> : <PaperPlaneTiltIcon size={22} weight="fill" />}
                </IconButton>
              </Stack>
            </>
          ) : null}
        </Box>
      </Card>
    </Stack>
  );
}
