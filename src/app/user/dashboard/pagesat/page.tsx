'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { CurrencyEur as CurrencyEurIcon } from '@phosphor-icons/react/dist/ssr/CurrencyEur';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalIconBox, PortalSectionCard } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { listMyPayments, listMySubscriptions, listOkazionVouchers, listPremiumVouchers } from '@/lib/payments-client';
import type { Payment, PaymentStatus, PaymentType, UserSubscriptionSummary } from '@/types/payment';

type SpendCategory = 'money' | 'boost';

interface BoostSpendRow {
  id: string;
  kind: 'premium' | 'okazion';
  description: string;
  amountBc: number;
  status: 'unused' | 'applied' | 'canceled' | string;
  createdAt: string;
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Në pritje',
  paid: 'E paguar',
  failed: 'Dështoi',
  canceled: 'Anuluar',
};

const STATUS_COLOR: Record<PaymentStatus, 'default' | 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
  canceled: 'default',
};

const VOUCHER_STATUS_LABEL: Record<string, string> = {
  unused: 'E blerë',
  applied: 'E përdorur',
  canceled: 'Anuluar',
};

const VOUCHER_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  unused: 'success',
  applied: 'default',
  canceled: 'error',
};

const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  subscription: 'Abonim',
  credits: 'Boost Coins',
  'auto-refresh': 'Auto-Refresh',
  premium: 'Premium',
  okazion: 'OKAZION',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('sq-AL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function paymentDescription(p: Payment): string {
  if (p.description?.trim()) return p.description.trim();
  return PAYMENT_TYPE_LABEL[p.type] || 'Pagesë';
}

function formatMoney(amount: number, currency: string): string {
  const cur = (currency || 'EUR').toUpperCase();
  const n = Number(amount);
  if (!Number.isFinite(n)) return `— ${cur}`;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} ${cur}`;
}

export default function MyPaymentsPage() {
  const t = useCopy();
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [boostSpends, setBoostSpends] = React.useState<BoostSpendRow[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<UserSubscriptionSummary[]>([]);
  const [category, setCategory] = React.useState<SpendCategory>('money');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, s, premium, okazion] = await Promise.all([
        listMyPayments(),
        listMySubscriptions(),
        listPremiumVouchers(false),
        listOkazionVouchers(false),
      ]);
      if (cancelled) return;

      const errors = [p.error, s.error, premium.error, okazion.error].filter(Boolean);
      if (errors.length) setError(errors[0] as string);

      setPayments((p.payments ?? []).filter((payment) => payment.status === 'paid'));
      setSubscriptions(s.subscriptions ?? []);

      const rows: BoostSpendRow[] = [];
      for (const v of premium.vouchers ?? []) {
        if (v.source !== 'boost_coins') continue;
        const bc = Math.max(0, Math.floor(Number(v.priceBc) || 0));
        if (bc <= 0) continue;
        rows.push({
          id: `premium-${v.id}`,
          kind: 'premium',
          description: `Premium listing · ${v.days} ditë`,
          amountBc: bc,
          status: v.status,
          createdAt: v.createdAt,
        });
      }
      for (const v of okazion.vouchers ?? []) {
        if (v.source !== 'boost_coins') continue;
        const bc = Math.max(0, Math.floor(Number(v.priceBc) || 0));
        if (bc <= 0) continue;
        rows.push({
          id: `okazion-${v.id}`,
          kind: 'okazion',
          description: `OKAZION listing · ${v.days} ditë`,
          amountBc: bc,
          status: v.status,
          createdAt: v.createdAt,
        });
      }
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBoostSpends(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack spacing={2.5}>
      <UserPageHeader
        icon={<ReceiptIcon size={20} weight="duotone" />}
        title={t.nav.payments}
        description="Abonimet aktive dhe historiku i shpenzimeve."
      />

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack spacing={1.75}>
          {subscriptions.length > 0 ? (
            <PortalSectionCard
              title="Abonimet"
              description="Planet aktive dhe skadimi i tyre."
              icon={<CreditCardIcon size={22} weight="duotone" />}
            >
              <Stack spacing={1.25}>
                {subscriptions.map((sub) => (
                  <Box
                    key={sub.id}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}
                    >
                      <Typography sx={{ fontWeight: 800 }}>{sub.contractTitle || 'Abonim'}</Typography>
                      <Chip
                        size="small"
                        color={sub.status === 'active' ? 'success' : 'default'}
                        label={sub.status === 'active' ? 'Aktiv' : sub.status === 'expired' ? 'Skaduar' : 'Anuluar'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {sub.months} muaj · {sub.priceEur} € · skadon {formatDate(sub.expiresAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </PortalSectionCard>
          ) : null}

          <PortalSectionCard
            title="Historiku"
            description="Shpenzimet me para dhe me Boost Coins."
            icon={<ReceiptIcon size={22} weight="duotone" />}
            headerExtra={
              <Chip
                size="small"
                label={category === 'money' ? `${payments.length}` : `${boostSpends.length}`}
                sx={{ fontWeight: 800 }}
              />
            }
          >
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={category}
              onChange={(_event, value: SpendCategory | null) => {
                if (value) setCategory(value);
              }}
              aria-label="Kategoria e shpenzimeve"
              sx={{
                mb: 1.75,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                borderRadius: 2,
                '& .MuiToggleButtonGroup-grouped': {
                  border: 0,
                  mx: 0,
                  px: 1.25,
                  py: 1,
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  letterSpacing: '0.02em',
                  textTransform: 'none',
                  color: 'text.secondary',
                  borderRadius: '10px !important',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.main' },
                  },
                },
              }}
            >
              <ToggleButton value="money" aria-label="Shpenzime me para">
                <CurrencyEurIcon size={16} weight="bold" />
                Me para
              </ToggleButton>
              <ToggleButton value="boost" aria-label="Shpenzime me Boost Coins">
                <BoostCoinIcon size={16} />
                Me Boost Coins
              </ToggleButton>
            </ToggleButtonGroup>

            {category === 'money' ? (
              payments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                  Nuk keni ende asnjë pagesë me para.
                </Typography>
              ) : (
                <Stack spacing={1.1}>
                  {payments.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.25,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                        <PortalIconBox size={40}>
                          <CurrencyEurIcon size={20} weight="duotone" />
                        </PortalIconBox>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  lineHeight: 1.35,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {paymentDescription(p)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                                {PAYMENT_TYPE_LABEL[p.type] || 'Pagesë'} · {formatDate(p.createdAt)}
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                            >
                              {formatMoney(p.amount, p.currency)}
                            </Typography>
                          </Stack>
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              size="small"
                              color={STATUS_COLOR[p.status]}
                              label={STATUS_LABEL[p.status]}
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )
            ) : boostSpends.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 1 }}>
                Nuk keni ende asnjë shpenzim me Boost Coins.
              </Typography>
            ) : (
              <Stack spacing={1.1}>
                {boostSpends.map((row) => (
                  <Box
                    key={row.id}
                    sx={{
                      p: 1.75,
                      borderRadius: 2.25,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                      <PortalIconBox size={40}>
                        <BoostCoinIcon size={20} />
                      </PortalIconBox>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                lineHeight: 1.35,
                                wordBreak: 'break-word',
                              }}
                            >
                              {row.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                              {row.kind === 'premium' ? 'Premium' : 'OKAZION'} · {formatDate(row.createdAt)}
                            </Typography>
                          </Box>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap' }}
                          >
                            <BoostCoinIcon size={16} />
                            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{row.amountBc}</Typography>
                          </Stack>
                        </Stack>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            size="small"
                            color={VOUCHER_STATUS_COLOR[row.status] || 'default'}
                            label={VOUCHER_STATUS_LABEL[row.status] || row.status}
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </PortalSectionCard>
        </Stack>
      )}
    </Stack>
  );
}
