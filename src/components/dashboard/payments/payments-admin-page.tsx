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

import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import { listAdminPayments } from '@/lib/admin-payments-client';
import type { AdminPayment, AdminPaymentsResponse, PaymentStatus } from '@/types/payment';

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', mt: 0.5 }}>{value}</Typography>
    </Box>
  );
}

export function PaymentsAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [data, setData] = React.useState<AdminPaymentsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [page, setPage] = React.useState(1);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await listAdminPayments({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
      page,
      limit: 25,
    });
    if (err) setError(err);
    else setData(res ?? null);
    setLoading(false);
  }, [statusFilter, typeFilter, page]);

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void load();
  }, [user, isPlatformAdmin, load]);

  if (!user || !isPlatformAdmin) return null;

  const payments: AdminPayment[] = data?.payments ?? [];
  const revenue = data?.revenueByCurrency ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
          Pagesat
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Të gjitha pagesat e kryera nëpërmjet POK në platformë.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Pagesa gjithsej" value={String(data?.total ?? 0)} />
        </Grid>
        {revenue.length > 0 ? (
          revenue.map((r) => (
            <Grid key={r.currency} size={{ xs: 12, sm: 4 }}>
              <StatCard
                label={`Të ardhura të paguara (${r.currency})`}
                value={`${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(r.total)} ${r.currency}`}
              />
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Të ardhura të paguara" value="0.00 EUR" />
          </Grid>
        )}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          size="small"
          label="Statusi"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Të gjitha</MenuItem>
          <MenuItem value="paid">E paguar</MenuItem>
          <MenuItem value="pending">Në pritje</MenuItem>
          <MenuItem value="failed">Dështoi</MenuItem>
          <MenuItem value="canceled">Anuluar</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Lloji"
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Të gjitha</MenuItem>
          <MenuItem value="subscription">Abonim</MenuItem>
          <MenuItem value="credits">Kredite</MenuItem>
        </TextField>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            Nuk ka pagesa për këto filtra.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Paguesi</TableCell>
                <TableCell>Përshkrimi</TableCell>
                <TableCell>Lloji</TableCell>
                <TableCell align="right">Shuma</TableCell>
                <TableCell align="right">Statusi</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.payer.name || '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.payer.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.description || '—'}</TableCell>
                  <TableCell>{p.type === 'credits' ? 'Kredite' : 'Abonim'}</TableCell>
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

      {data && data.totalPages > 1 ? (
        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Pagination
            count={data.totalPages}
            page={page}
            onChange={(_e, value) => setPage(value)}
            color="primary"
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
