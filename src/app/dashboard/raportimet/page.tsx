'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Chip, Grid, Stack, TextField, Typography } from '@mui/material';
import { Flag as FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';

import { paths } from '@/paths';
import {
  fetchAdminReports,
  REPORT_REASON_LABELS,
  updateAdminReport,
  type AdminContentReport,
} from '@/lib/moderation-client';
import { useUser } from '@/hooks/use-user';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

type StatusFilter = 'open' | 'resolved' | 'dismissed' | 'all';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Të hapura' },
  { value: 'resolved', label: 'Zgjidhur' },
  { value: 'dismissed', label: 'Refuzuar' },
  { value: 'all', label: 'Të gjitha' },
];

const TARGET_LABELS: Record<AdminContentReport['targetType'], string> = {
  listing: 'Njoftim',
  user: 'Përdorues',
  message: 'Mesazh',
};

const KIND_LABELS: Record<string, string> = {
  'real-estate': 'Prona',
  cars: 'Makina',
  jobs: 'Punë',
  marketplace: 'Tregu',
  businesses: 'Biznese',
  professionals: 'Profesionistë',
};

function statusChip(status: AdminContentReport['status']) {
  if (status === 'resolved') return <Chip size="small" label="Zgjidhur" color="success" sx={{ fontWeight: 700 }} />;
  if (status === 'dismissed') return <Chip size="small" label="Refuzuar" sx={{ fontWeight: 700 }} />;
  return <Chip size="small" label="E hapur" color="warning" sx={{ fontWeight: 700 }} />;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sq-AL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function personLine(name: string | null, email: string | null): string {
  return [name, email].filter(Boolean).join(' · ') || '—';
}

export default function ContentReportsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [filter, setFilter] = React.useState<StatusFilter>('open');
  const [reports, setReports] = React.useState<AdminContentReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [setupPending, setSetupPending] = React.useState(false);
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [actingId, setActingId] = React.useState<string | null>(null);

  const isAdmin = user?.accountType === 'admin' || (!user?.accountType && user?.role === 'admin');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminReports(filter);
    if (res.error) setError(res.error);
    else {
      setReports(res.reports ?? []);
      setSetupPending(Boolean(res.setupPending));
    }
    setLoading(false);
  }, [filter]);

  React.useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      router.replace(paths.dashboard.overview);
      return;
    }
    void load();
  }, [user, isAdmin, router, load]);

  const act = async (report: AdminContentReport, status: AdminContentReport['status']) => {
    setActingId(report.id);
    const res = await updateAdminReport(report.id, status, notes[report.id]);
    setActingId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    await load();
  };

  if (!user || !isAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(FlagIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Përmbajtja"
        title="Raportimet"
        description="Raportimet nga përdoruesit për njoftime, mesazhe dhe profile. Shqyrtoji brenda 24 orëve; hiq njoftimin nga faqja Njoftimet nëse shkel rregullat."
        actions={
          <Button component={Link} href={paths.dashboard.listingModeration} variant="outlined" sx={productButtonSx}>
            Hap Njoftimet
          </Button>
        }
      />

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {STATUS_FILTERS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            color={filter === opt.value ? 'primary' : 'default'}
            variant={filter === opt.value ? 'filled' : 'outlined'}
            onClick={() => setFilter(opt.value)}
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          />
        ))}
      </Stack>

      {setupPending ? (
        <Alert severity="warning">
          Tabela e raportimeve nuk ekziston ende. Ekzekutoni migrimin 20260927120000_content_reports_user_blocks.sql.
        </Alert>
      ) : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Typography color="text.secondary">Duke ngarkuar…</Typography>
      ) : reports.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          Nuk ka raportime për këtë filtër.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {reports.map((r) => (
            <Grid size={{ xs: 12, md: 6 }} key={r.id}>
              <Box sx={{ ...productPanelSx, p: 2, height: '100%' }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {statusChip(r.status)}
                    <Chip size="small" variant="outlined" label={TARGET_LABELS[r.targetType]} sx={{ fontWeight: 700 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {formatDate(r.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800 }}>{REPORT_REASON_LABELS[r.reason] ?? r.reason}</Typography>
                  {r.targetType === 'listing' ? (
                    <Typography variant="body2">
                      <strong>Njoftimi:</strong> {r.listingTitle || r.listingId}
                      {r.listingKind ? ` (${KIND_LABELS[r.listingKind] ?? r.listingKind})` : ''}
                    </Typography>
                  ) : null}
                  {r.messageExcerpt ? (
                    <Typography
                      variant="body2"
                      sx={{ p: 1, borderRadius: 1.5, bgcolor: 'action.hover', whiteSpace: 'pre-wrap' }}
                    >
                      “{r.messageExcerpt}”
                    </Typography>
                  ) : null}
                  {r.details ? (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {r.details}
                    </Typography>
                  ) : null}
                  <Typography variant="body2">
                    <strong>Raportuar nga:</strong> {personLine(r.reporterName, r.reporterEmail)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Përdoruesi i raportuar:</strong> {personLine(r.reportedUserName, r.reportedUserEmail)}
                  </Typography>
                  <TextField
                    size="small"
                    label="Shënim admini"
                    value={notes[r.id] ?? r.adminNote}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    sx={productFieldSx}
                    fullWidth
                  />
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {r.status !== 'resolved' ? (
                      <Button
                        variant="contained"
                        color="success"
                        disabled={actingId === r.id}
                        onClick={() => void act(r, 'resolved')}
                        sx={productButtonSx}
                      >
                        Zgjidhur
                      </Button>
                    ) : null}
                    {r.status !== 'dismissed' ? (
                      <Button
                        variant="outlined"
                        disabled={actingId === r.id}
                        onClick={() => void act(r, 'dismissed')}
                        sx={productButtonSx}
                      >
                        Refuzo
                      </Button>
                    ) : null}
                    {r.status !== 'open' ? (
                      <Button
                        variant="text"
                        disabled={actingId === r.id}
                        onClick={() => void act(r, 'open')}
                        sx={productButtonSx}
                      >
                        Rihap
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}
