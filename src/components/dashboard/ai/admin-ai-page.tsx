'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Database as DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { Warning as WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

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
import { errorMainAlpha, primaryMainAlpha, warningMainAlpha } from '@/lib/css-var-alpha';
import { PRESS_FEEDBACK } from '@/styles/motion';
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

const TOOL_LABELS: Record<string, string> = {
  lookup_user: 'Përdoruesi',
  get_user_overview: 'Llogaria',
  adjust_boost_credits: 'Boost Coins',
  set_auto_refresh_slots: 'Auto-Refresh',
  set_user_password: 'Fjalëkalimi',
  set_user_active: 'Statusi',
  delete_user: 'Fshirje',
  list_pending_listings: 'Njoftime pending',
  review_listing: 'Moderim',
  get_platform_stats: 'Statistikat',
  list_user_payments: 'Pagesat',
  grant_subscription: 'Paketa',
  cancel_subscription: 'Anulim pakete',
  update_user_identity: 'NIPT / ID',
  diagnose_schema: 'Diagnoza e skemës',
  list_db_tables: 'Tabelat',
  inspect_table: 'Tabela',
  count_rows: 'Numërimi',
  repair_missing_schema: 'Ndreqje skeme',
  ensure_referral_program: 'Programi i referimit',
  list_recent_ai_actions: 'Auditi',
};

type UiMessage = AdminAiChatMessage & { toolsUsed?: AdminAiToolUse[] };

function toolLabel(name: string) {
  return TOOL_LABELS[name] || name.replaceAll('_', ' ');
}

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

function toolTone(status: AdminAiToolUse['status']) {
  if (status === 'ok') {
    return {
      color: 'success.main' as const,
      border: 'rgba(var(--mui-palette-success-mainChannel) / 0.42)',
      bg: 'rgba(var(--mui-palette-success-mainChannel) / 0.12)',
    };
  }
  if (status === 'needs_confirmation') {
    return {
      color: 'warning.main' as const,
      border: warningMainAlpha(0.5),
      bg: warningMainAlpha(0.12),
    };
  }
  if (status === 'error') {
    return {
      color: 'error.main' as const,
      border: errorMainAlpha(0.5),
      bg: errorMainAlpha(0.12),
    };
  }
  return {
    color: 'text.secondary' as const,
    border: 'divider',
    bg: 'action.hover',
  };
}

function ToolNameIcon({ name }: { name: string }) {
  const Icon: PhosphorIcon =
    name.includes('user') || name.includes('password') || name.includes('identity')
      ? UserIcon
      : name.includes('credit') || name.includes('subscription') || name.includes('payment')
        ? CoinsIcon
        : name.includes('schema') || name.includes('table') || name.includes('count') || name.includes('db')
          ? DatabaseIcon
          : name.includes('lookup') || name.includes('inspect') || name.includes('list')
            ? MagnifyingGlassIcon
            : SparkleIcon;
  return React.createElement(Icon, { size: 13, weight: 'bold' });
}

function ToolUseList({ tools }: { tools: AdminAiToolUse[] }) {
  const compact = tools.filter((tool) => tool.status === 'ok' && (!tool.summary || tool.summary === tool.name));
  const detailed = tools.filter((tool) => !(tool.status === 'ok' && (!tool.summary || tool.summary === tool.name)));

  return (
    <Stack spacing={0.75} sx={{ mt: 1, width: '100%' }}>
      {compact.length > 0 ? (
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {compact.map((tool, idx) => {
            const tone = toolTone(tool.status);
            return (
              <Box
                key={`${tool.name}-compact-${idx}`}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.6,
                  px: 1,
                  py: 0.45,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: tone.border,
                  bgcolor: tone.bg,
                  color: tone.color,
                }}
              >
                <ToolNameIcon name={tool.name} />
                <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2 }}>
                  {toolLabel(tool.name)}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      ) : null}

      {detailed.map((tool, idx) => {
        const tone = toolTone(tool.status);
        const summary = tool.summary && tool.summary !== tool.name ? tool.summary : null;
        return (
          <Box
            key={`${tool.name}-detail-${idx}`}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.15,
              py: 0.9,
              borderRadius: 2,
              border: '1px solid',
              borderColor: tone.border,
              bgcolor: tone.bg,
              minWidth: 0,
              width: '100%',
            }}
          >
            <Box sx={{ color: tone.color, mt: '2px', flexShrink: 0, display: 'inline-flex' }}>
              {tool.status === 'needs_confirmation' ? (
                React.createElement(WarningIcon, { size: 15, weight: 'fill' })
              ) : (
                <ToolNameIcon name={tool.name} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: tone.color,
                  lineHeight: 1.2,
                }}
              >
                {toolLabel(tool.name)}
              </Typography>
              {summary ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.35,
                    color: 'text.primary',
                    fontWeight: 600,
                    lineHeight: 1.45,
                    overflowWrap: 'anywhere',
                    whiteSpace: 'normal',
                  }}
                >
                  {summary}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function ConfirmBar({
  action,
  sending,
  onCancel,
  onConfirm,
}: {
  action: AdminAiPendingAction;
  sending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Box
      sx={{
        mx: { xs: 1.5, md: 2 },
        mb: 1.5,
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: warningMainAlpha(0.55),
        bgcolor: (t) => (t.palette.mode === 'dark' ? warningMainAlpha(0.14) : warningMainAlpha(0.1)),
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.75,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: warningMainAlpha(0.22),
              color: 'warning.main',
            }}
          >
            {React.createElement(WarningIcon, { size: 18, weight: 'fill' })}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'warning.main',
                lineHeight: 1.2,
              }}
            >
              Kërkohet konfirmim · {toolLabel(action.name)}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.55,
                fontWeight: 600,
                lineHeight: 1.5,
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap',
              }}
            >
              {action.summary}
            </Typography>
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
          <Button
            size="small"
            color="inherit"
            startIcon={React.createElement(XIcon, { size: 14 })}
            onClick={onCancel}
            sx={{ ...productButtonSx, fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
          >
            Anulo
          </Button>
          <Button
            size="small"
            variant="contained"
            color="warning"
            disabled={sending}
            startIcon={React.createElement(CheckIcon, { size: 14, weight: 'bold' })}
            onClick={onConfirm}
            sx={{
              ...productButtonSx,
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 140 },
              color: '#111',
              fontWeight: 800,
            }}
          >
            Konfirmo
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
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
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            px: { xs: 1.75, md: 2.25 },
            py: 1.25,
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'action.hover'),
          }}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.12),
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            {React.createElement(SparkleIcon, { size: 15, weight: 'fill' })}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', lineHeight: 1.2 }}>Asistenti</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {pendingAction ? 'Në pritje të konfirmimit' : 'Gati për urdhra'}
            </Typography>
          </Box>
        </Stack>

        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, md: 2.5 }, py: 2 }}>
          {messages.length === 0 && !sending ? (
            <Stack spacing={2.25} sx={{ py: { xs: 2, md: 4 }, alignItems: 'stretch', maxWidth: 560 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Shkruani në shqip, p.sh. “shto 200 BC te ana@email.com”, “sa rreshta ka referral_signups”, ose “ndreq
                skemën”. Asistenti nuk ekzekuton SQL të lirë dhe nuk prek llogari admin.
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {SUGGESTIONS.map((hint) => (
                  <Box
                    key={hint}
                    component="button"
                    type="button"
                    onClick={() => {
                      setInput(hint.includes('…') ? hint.replace('…', '') : hint);
                      inputRef.current?.focus();
                    }}
                    sx={{
                      ...PRESS_FEEDBACK,
                      appearance: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      m: 0,
                      px: 1.25,
                      py: 0.85,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'transparent',
                      color: 'text.primary',
                      font: 'inherit',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      lineHeight: 1.35,
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.12 : 0.08),
                      },
                    }}
                  >
                    {hint}
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {messages.map((msg, idx) => (
                <Box
                  key={`${msg.role}-${idx}`}
                  sx={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: { xs: '100%', sm: '92%', md: '82%' },
                    width: msg.role === 'assistant' && msg.toolsUsed?.length ? { xs: '100%', sm: 'auto' } : 'auto',
                    minWidth: 0,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'flex-end',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          mb: 0.15,
                          borderRadius: 1.25,
                          display: { xs: 'none', sm: 'inline-flex' },
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.12),
                          color: 'primary.main',
                        }}
                      >
                        {React.createElement(SparkleIcon, { size: 13, weight: 'fill' })}
                      </Box>
                    ) : null}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1.2,
                          borderRadius: msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                          bgcolor:
                            msg.role === 'user'
                              ? (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.22 : 0.12)
                              : 'action.hover',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.6,
                            fontWeight: msg.role === 'user' ? 600 : 500,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {msg.content}
                        </Typography>
                      </Box>
                      {msg.toolsUsed && msg.toolsUsed.length > 0 ? <ToolUseList tools={msg.toolsUsed} /> : null}
                    </Box>
                  </Stack>
                </Box>
              ))}
              {sending ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary', pl: { sm: 4.25 } }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Po punoj…
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          )}
        </Box>

        {error ? (
          <Alert severity="error" sx={{ mx: { xs: 1.5, md: 2 }, mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        {pendingAction ? (
          <ConfirmBar
            action={pendingAction}
            sending={sending}
            onCancel={() => setPendingAction(null)}
            onConfirm={() => void send('po', pendingAction)}
          />
        ) : null}

        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            px: { xs: 1.5, md: 2 },
            pb: 1.75,
            pt: 1.25,
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
              sx={{
                ...productFieldSx,
                '& .MuiOutlinedInput-root': {
                  ...productFieldSx['& .MuiOutlinedInput-root'],
                  borderRadius: 3,
                  py: 0.35,
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={sending || configured === false || !input.trim()}
              aria-label="Dërgo"
              sx={{
                ...PRESS_FEEDBACK,
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              {React.createElement(PaperPlaneTiltIcon, { size: 20, weight: 'fill' })}
            </IconButton>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}
