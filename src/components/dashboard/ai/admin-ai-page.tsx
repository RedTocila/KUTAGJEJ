'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import {
  fetchAdminAiActions,
  fetchAdminAiStatus,
  sendAdminAiChat,
  type AdminAiAuditRow,
  type AdminAiChatMessage,
  type AdminAiPendingAction,
  type AdminAiToolUse,
} from '@/lib/admin-ai-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { MOTION } from '@/styles/motion';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const STORAGE_KEY = 'kutagjej-admin-ai-chat';

const SUGGESTIONS = [
  'Sa njoftime pending ka platforma?',
  'Gjej përdoruesin me email …',
  'Shto 100 BC te user@email.com',
  'A ka probleme me skemën e Supabase?',
  'Sa rreshta ka referral_signups?',
  'Ndreq kolonat që mungojnë',
];

const CONFIRM_RE = /^(po|yes|ok|okay|confirm|konfirmo)\.?!?$/i;

type UiMessage = AdminAiChatMessage & { toolsUsed?: AdminAiToolUse[] };

function loadStoredMessages(): UiMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string')
      .slice(-30);
  } catch {
    return [];
  }
}

function persistMessages(messages: UiMessage[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.map(({ role, content }) => ({ role, content }))),
    );
  } catch {
    /* ignore quota */
  }
}

function toolChipColor(status: AdminAiToolUse['status']): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'ok') return 'success';
  if (status === 'needs_confirmation') return 'warning';
  if (status === 'error') return 'error';
  return 'default';
}

export function AdminAiPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<AdminAiPendingAction | null>(null);
  const [auditOpen, setAuditOpen] = React.useState(false);
  const [audit, setAudit] = React.useState<AdminAiAuditRow[]>([]);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMessages(loadStoredMessages());
  }, []);

  React.useEffect(() => {
    if (!isPlatformAdmin) return;
    void fetchAdminAiStatus().then((res) => {
      if (res.error) setConfigured(false);
      else setConfigured(res.configured !== false);
    });
  }, [isPlatformAdmin]);

  React.useEffect(() => {
    persistMessages(messages);
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, pendingAction]);

  const send = React.useCallback(
    async (text: string, confirm?: AdminAiPendingAction | null) => {
      const trimmed = text.trim();
      if (!trimmed && !confirm) return;
      if (sending) return;

      const history: AdminAiChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      if (trimmed) history.push({ role: 'user', content: trimmed });

      if (trimmed) {
        setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      }
      setInput('');
      setError(null);
      setSending(true);

      const res = await sendAdminAiChat({
        messages: history,
        confirmAction: confirm || undefined,
      });

      setSending(false);
      if (res.error || !res.data) {
        setError(res.error || 'AI dështoi.');
        return;
      }

      setPendingAction(res.data.pendingAction);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data!.reply, toolsUsed: res.data!.toolsUsed },
      ]);
      if (confirm) setPendingAction(null);
    },
    [messages, sending],
  );

  const onSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (pendingAction && CONFIRM_RE.test(text)) {
      void send(text, pendingAction);
      return;
    }
    void send(text);
  };

  const loadAudit = async () => {
    const next = !auditOpen;
    setAuditOpen(next);
    if (!next) return;
    const res = await fetchAdminAiActions();
    setAudit(res.actions ?? []);
  };

  if (!user || !isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(SparkleIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Panel"
        title="Asistent AI"
        description="Kontrolloni përdoruesit, Boost Coins, njoftime dhe tabela të lejuara me gjuhë natyrale. Nuk ekzekutohet SQL i lirë. Veprimet e rrezikshme kërkojnë konfirmim."
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => void loadAudit()} sx={productButtonSx}>
              {auditOpen ? 'Fshih auditin' : 'Auditi'}
            </Button>
            <IconButton
              aria-label="Pastro bisedën"
              onClick={() => {
                setMessages([]);
                setPendingAction(null);
                persistMessages([]);
              }}
            >
              {React.createElement(TrashIcon, { size: 20 })}
            </IconButton>
          </Stack>
        }
      />

      {configured === false ? (
        <Alert severity="warning">
          OPENAI_API_KEY mungon në API. Shtojeni në <code>backend/.env</code> dhe rinisni serverin.
        </Alert>
      ) : null}

      <Collapse in={auditOpen}>
        <Box sx={{ ...productPanelSx, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
            Veprimet e fundit
          </Typography>
          {audit.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nuk ka ende veprime të regjistruara.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {audit.map((row) => (
                <Typography key={row.id} variant="caption" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                  {row.createdAt ? new Date(row.createdAt).toLocaleString('sq-AL') : '—'} · {row.adminEmail} ·{' '}
                  <Box component="span" sx={{ color: row.ok ? 'success.main' : 'error.main', fontWeight: 700 }}>
                    {row.tool}
                  </Box>
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>

      <Box
        sx={{
          ...productPanelSx,
          display: 'flex',
          flexDirection: 'column',
          minHeight: { xs: 520, md: 640 },
          height: { md: 'calc(100dvh - 260px)' },
        }}
      >
        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, py: 2.5 }}>
          {messages.length === 0 && !sending ? (
            <Stack spacing={2} sx={{ py: 4, alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                Shkruani në shqip, p.sh. “shto 200 BC te ana@email.com”, “sa rreshta ka referral_signups”, ose “ndreq skemën”. Asistenti nuk
                ekzekuton SQL të lirë dhe nuk prek llogari admin.
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((hint) => (
                  <Chip
                    key={hint}
                    label={hint}
                    onClick={() => {
                      setInput(hint.includes('…') ? hint.replace('…', '') : hint);
                      inputRef.current?.focus();
                    }}
                    sx={{ fontWeight: 600 }}
                  />
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.75}>
              {messages.map((msg, idx) => (
                <Box
                  key={`${msg.role}-${idx}`}
                  sx={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: { xs: '92%', md: '78%' },
                  }}
                >
                  <Box
                    sx={{
                      px: 1.75,
                      py: 1.25,
                      borderRadius: 2.5,
                      bgcolor:
                        msg.role === 'user'
                          ? (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.22 : 0.12)
                          : 'action.hover',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.6, fontWeight: msg.role === 'user' ? 600 : 500 }}>
                      {msg.content}
                    </Typography>
                  </Box>
                  {msg.toolsUsed && msg.toolsUsed.length > 0 ? (
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                      {msg.toolsUsed.map((tool, toolIdx) => (
                        <Chip
                          key={`${tool.name}-${toolIdx}`}
                          size="small"
                          color={toolChipColor(tool.status)}
                          variant="outlined"
                          label={tool.summary || tool.name}
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Box>
              ))}
              {sending ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption">Po punoj…</Typography>
                </Stack>
              ) : null}
            </Stack>
          )}
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mx: 2, mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {pendingAction ? (
          <Alert
            severity="warning"
            sx={{ mx: 2, mb: 1.5 }}
            action={
              <Stack direction="row" spacing={0.5}>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={React.createElement(XIcon, { size: 14 })}
                  onClick={() => setPendingAction(null)}
                  sx={{ ...productButtonSx, fontWeight: 700 }}
                >
                  Anulo
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  disabled={sending}
                  startIcon={React.createElement(CheckIcon, { size: 14 })}
                  onClick={() => void send('po', pendingAction)}
                  sx={productButtonSx}
                >
                  Konfirmo
                </Button>
              </Stack>
            }
          >
            {pendingAction.summary}
          </Alert>
        ) : null}

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            px: 2,
            pb: 2,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={5}
              placeholder="Shkruani një urdhër… p.sh. shto 100 BC te ana@email.com"
              value={input}
              disabled={sending || configured === false}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              sx={productFieldSx}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={sending || configured === false || !input.trim()}
              sx={{
                ...productButtonSx,
                minWidth: 48,
                height: 48,
                px: 0,
                transition: `transform ${MOTION.fast} ${MOTION.ease}`,
              }}
              aria-label="Dërgo"
            >
              {React.createElement(PaperPlaneTiltIcon, { size: 20, weight: 'fill' })}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
