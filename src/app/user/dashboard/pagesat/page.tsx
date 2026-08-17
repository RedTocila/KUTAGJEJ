'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { CurrencyEur as CurrencyEurIcon } from '@phosphor-icons/react/dist/ssr/CurrencyEur';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalIconBox, PortalSectionCard, portalToggleGroupSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import {
  cancelMySubscription,
  listMyPayments,
  listMySubscriptions,
  listOkazionVouchers,
  listPremiumVouchers,
} from '@/lib/payments-client';
import type { Payment, PaymentStatus, PaymentType, UserSubscriptionSummary } from '@/types/payment';
import { productButtonSx } from '@/styles/product-sx';

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
  const [cancelTarget, setCancelTarget] = React.useState<UserSubscriptionSummary | null>(null);
  const [canceling, setCanceling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = React.useState<string | null>(null);

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

  const handleConfirmCancel = async () => {
    if (!cancelTarget || canceling) return;
    setCanceling(true);
    setCancelError(null);
    const res = await cancelMySubscription(cancelTarget.id);
    setCanceling(false);
    if (res.error || !res.subscription) {
      setCancelError(res.error || t.myPayments.cancelFailed);
      return;
    }
    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === res.subscription!.id ? { ...sub, ...res.subscription! } : sub)),
    );
    setCancelSuccess(t.myPayments.cancelSuccess);
    setCancelTarget(null);
  };

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

      {cancelSuccess ? (
        <Alert severity="success" sx={{ borderRadius: 2.5 }} onClose={() => setCancelSuccess(null)}>
          {cancelSuccess}
        </Alert>
      ) : null}

      {loading ? (
        <ContentBlockSkeleton rows={5} rowHeight={96} />
      ) : (
        <Stack spacing={1.75}>
          {subscriptions.length > 0 ? (
            <PortalSectionCard
              title={t.myPayments.subscriptionsTitle}
              description={t.myPayments.subscriptionsDescription}
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
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
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
                        label={
                          sub.status === 'active'
                            ? t.myPayments.active
                            : sub.status === 'expired'
                              ? t.myPayments.expired
                              : t.myPayments.canceled
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {sub.months} muaj · {sub.priceEur} € · skadon {formatDate(sub.expiresAt)}
                    </Typography>
                    {sub.status === 'active' ? (
                      <Box sx={{ mt: 1.25 }}>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => {
                            setCancelError(null);
                            setCancelTarget(sub);
                          }}
                          sx={{ ...productButtonSx, fontWeight: 750 }}
                        >
                          {t.myPayments.cancelSubscription}
                        </Button>
                      </Box>
                    ) : null}
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
              sx={[
                portalToggleGroupSx,
                {
                  mb: 1.75,
                  width: '100%',
                  '& .MuiToggleButtonGroup-grouped': {
                    flex: 1,
                    minWidth: 0,
                    minHeight: 38,
                    px: 1.5,
                    py: 0.85,
                    gap: 0.75,
                    fontSize: '0.8rem',
                    letterSpacing: '0.01em',
                    textTransform: 'none',
                  },
                },
              ]}
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

      <ProductDialog
        open={Boolean(cancelTarget)}
        onClose={canceling ? undefined : () => setCancelTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={canceling ? undefined : () => setCancelTarget(null)}>
          {t.myPayments.cancelConfirmTitle}
        </ProductDialogTitle>
        <ProductDialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontWeight: 550 }}>
            {cancelTarget
              ? `${cancelTarget.contractTitle || 'Abonim'} · ${cancelTarget.months} muaj. ${t.myPayments.cancelConfirmBody}`
              : t.myPayments.cancelConfirmBody}
          </Typography>
          {cancelError ? (
            <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
              {cancelError}
            </Alert>
          ) : null}
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            onClick={() => setCancelTarget(null)}
            disabled={canceling}
            sx={productButtonSx}
          >
            {t.myPayments.keepSubscription}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={canceling}
            onClick={() => void handleConfirmCancel()}
            sx={productButtonSx}
          >
            {canceling ? t.myPayments.canceling : t.myPayments.cancelConfirmCta}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
