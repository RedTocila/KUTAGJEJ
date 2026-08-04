'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';

import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { PortalSectionCard, PortalSurface } from '@/components/user/portal-cards';
import { listMyPayments, listMySubscriptions } from '@/lib/payments-client';
import type { Payment, PaymentStatus, UserSubscriptionSummary } from '@/types/payment';

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

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('sq-AL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function MyPaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<UserSubscriptionSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, s] = await Promise.all([listMyPayments(), listMySubscriptions()]);
      if (cancelled) return;
      if (p.error) setError(p.error);
      setPayments(p.payments ?? []);
      setSubscriptions(s.subscriptions ?? []);
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
        title="Pagesat e mia"
        description="Abonimet aktive dhe historiku i transakcioneve."
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

          <PortalSurface sx={{ p: { xs: 1, sm: 1.5 } }}>
            {payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Nuk keni ende asnjë pagesë.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Përshkrimi</TableCell>
                      <TableCell align="right">Shuma</TableCell>
                      <TableCell align="right">Statusi</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell>{formatDate(p.createdAt)}</TableCell>
                        <TableCell>{p.description || (p.type === 'credits' ? 'Blerje kreditesh' : 'Abonim')}</TableCell>
                        <TableCell align="right">
                          {p.amount} {p.currency}
                        </TableCell>
                        <TableCell align="right">
                          <Chip size="small" color={STATUS_COLOR[p.status]} label={STATUS_LABEL[p.status]} sx={{ fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </PortalSurface>
        </Stack>
      )}
    </Stack>
  );
}
