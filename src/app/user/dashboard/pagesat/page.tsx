'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

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
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
        Pagesat e mia
      </Typography>

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {subscriptions.length > 0 ? (
            <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Abonimet
              </Typography>
              <Stack spacing={1.5}>
                {subscriptions.map((sub) => (
                  <Box key={sub.id} sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700 }}>{sub.contractTitle || 'Abonim'}</Typography>
                      <Chip
                        size="small"
                        color={sub.status === 'active' ? 'success' : 'default'}
                        label={sub.status === 'active' ? 'Aktiv' : sub.status === 'expired' ? 'Skaduar' : 'Anuluar'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {sub.months} muaj · {sub.priceEur} € · skadon {formatDate(sub.expiresAt)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Divider sx={{ mt: 2 }} />
            </Box>
          ) : null}

          <Box sx={{ p: { xs: 1, sm: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            {payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                Nuk keni ende asnjë pagesë.
              </Typography>
            ) : (
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
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
