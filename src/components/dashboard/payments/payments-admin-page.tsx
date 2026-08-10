'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import { CreditCard as CreditCardIcon } from '@phosphor-icons/react/dist/ssr/CreditCard';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import { listAdminPayments } from '@/lib/admin-payments-client';
import type { AdminPayment, AdminPaymentsResponse, PaymentType } from '@/types/payment';
import { MOTION } from '@/styles/motion';
import { productFieldSx, productPanelSx } from '@/styles/product-sx';

const TYPE_LABEL: Record<PaymentType, string> = {
  subscription: 'Abonim',
  credits: 'Boost Coins',
  'auto-refresh': 'Auto-Refresh',
  premium: 'Premium',
  okazion: 'OKAZION',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('sq-AL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Box
      sx={{
        ...productPanelSx,
        p: 2.5,
        ...(accent
          ? {
              borderColor: 'primary.main',
              bgcolor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(130, 201, 30, 0.08)' : 'rgba(130, 201, 30, 0.06)',
            }
          : null),
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', mt: 0.5, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function PaymentsAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [data, setData] = React.useState<AdminPaymentsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await listAdminPayments({
      status: 'paid',
      type: typeFilter || undefined,
      page,
      limit: 25,
    });
    if (err) setError(err);
    else setData(res ?? null);
    setLoading(false);
  }, [typeFilter, page]);

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void load();
  }, [user, isPlatformAdmin, load]);

  if (!user || !isPlatformAdmin) return null;

  const payments: AdminPayment[] = data?.payments ?? [];
  const revenue = data?.revenueByCurrency ?? [];
  const paidCount = revenue.reduce((sum, r) => sum + (r.count || 0), 0);

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(CreditCardIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Financa"
        title="Pagesat"
        description="Vetëm pagesat e suksesshme (të paguara). Porositë e hapura por të papaguara nuk shfaqen."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Pagesa të suksesshme" value={String(data?.total ?? paidCount)} accent />
        </Grid>
        {revenue.length > 0 ? (
          revenue.map((r) => (
            <Grid key={r.currency} size={{ xs: 12, sm: 4 }}>
              <StatCard
                label={`Të ardhura (${r.currency})`}
                value={`${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(r.total)} ${r.currency}`}
              />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Të ardhura" value="0.00 EUR" />
          </Grid>
        )}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Chip label="Vetëm të paguara" color="success" size="small" sx={{ fontWeight: 700, height: 28 }} />
        <TextField
          select
          size="small"
          label="Lloji"
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
          sx={{ minWidth: 200, ...productFieldSx }}
        >
          <MenuItem value="">Të gjitha</MenuItem>
          <MenuItem value="subscription">Abonim</MenuItem>
          <MenuItem value="credits">Boost Coins</MenuItem>
          <MenuItem value="auto-refresh">Auto-Refresh</MenuItem>
          <MenuItem value="premium">Premium</MenuItem>
          <MenuItem value="okazion">OKAZION</MenuItem>
        </TextField>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ ...productPanelSx, overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            Nuk ka pagesa të suksesshme për këtë filtër.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Paguesi</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Përshkrimi</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lloji</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Shuma
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Statusi
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow
                  key={p.id}
                  hover
                  sx={{
                    transition: `background-color ${MOTION.fast} ${MOTION.ease}`,
                  }}
                >
                  <TableCell>{formatDate(p.paidAt || p.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {p.payer.name || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.payer.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap title={p.description || undefined}>
                      {p.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={TYPE_LABEL[p.type] || p.type}
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: '8px' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {p.amount} {p.currency}
                  </TableCell>
                  <TableCell align="right">
                    <Chip size="small" color="success" label="E paguar" sx={{ fontWeight: 700 }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      {data && data.totalPages > 1 ? (
        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Pagination count={data.totalPages} page={page} onChange={(_e, value) => setPage(value)} color="primary" />
        </Stack>
      ) : null}
    </Stack>
  );
}
