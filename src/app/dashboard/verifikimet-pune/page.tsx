'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { paths } from '@/paths';
import {
  listJobEmployerVerificationRequests,
  reviewJobEmployerVerificationRequest,
} from '@/lib/admin-job-employer-verification-client';
import type { JobEmployerVerificationRequest } from '@/lib/job-employer-verification-client';
import { useUser } from '@/hooks/use-user';

function statusChip(status: JobEmployerVerificationRequest['status']) {
  if (status === 'approved') return <Chip size="small" label="Aprovuar" color="success" />;
  if (status === 'rejected') return <Chip size="small" label="Refuzuar" color="error" />;
  return <Chip size="small" label="Në pritje" color="warning" />;
}

export default function JobEmployerVerificationAdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [requests, setRequests] = React.useState<JobEmployerVerificationRequest[]>([]);
  const [filter, setFilter] = React.useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<JobEmployerVerificationRequest | null>(null);
  const [adminNote, setAdminNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  const isAdmin = user?.accountType === 'admin' || (!user?.accountType && user?.role === 'admin');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listJobEmployerVerificationRequests(filter === 'pending' ? 'pending' : 'all');
    if (res.error) setError(res.error);
    else setRequests(res.requests ?? []);
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

  const review = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    setActing(true);
    const res = await reviewJobEmployerVerificationRequest(selected.id, decision, adminNote);
    if (res.error) setError(res.error);
    else {
      setSelected(null);
      setAdminNote('');
      await load();
    }
    setActing(false);
  };

  if (!user || !isAdmin) return null;

  const snap = selected?.applicantSnapshot;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(ShieldCheckIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Verifikimet"
        title="Punëdhënësit"
        description="Shqyrtoni kërkesat e punëdhënësve për shenjën e verifikuar në njoftimet e punës."
        actions={
          <>
            <Button variant={filter === 'pending' ? 'contained' : 'outlined'} onClick={() => setFilter('pending')}>
              Në pritje
            </Button>
            <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')}>
              Të gjitha
            </Button>
          </>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Typography color="text.secondary">Duke ngarkuar…</Typography>
      ) : requests.length === 0 ? (
        <Alert severity="info">Nuk ka kërkesa për këtë filtër.</Alert>
      ) : (
        <Grid container spacing={2}>
          {requests.map((req) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={req.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' },
                }}
                onClick={() => {
                  setSelected(req);
                  setAdminNote(req.adminNote ?? '');
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    {statusChip(req.status)}
                    <Typography sx={{ fontWeight: 700 }}>{req.applicantSnapshot.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {req.applicantSnapshot.email}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {new Date(req.createdAt).toLocaleString('sq-AL')}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Detajet e kërkesës</DialogTitle>
        <DialogContent dividers>
          {snap ? (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{snap.displayName}</Typography>
              <DetailRow label="Lloji" value={snap.accountKind === 'business' ? 'Biznes' : 'Individ'} />
              <DetailRow label="Email" value={snap.email} />
              <DetailRow label="Telefon" value={snap.phone || '—'} />
              {snap.businessName ? <DetailRow label="Emri i biznesit" value={snap.businessName} /> : null}
              {snap.nipt ? <DetailRow label="NIPT" value={snap.nipt} /> : null}
              {snap.businessOwner ? <DetailRow label="Pronari" value={snap.businessOwner} /> : null}
              {snap.businessCategory ? <DetailRow label="Kategoria" value={snap.businessCategory} /> : null}
              {snap.firstName ? <DetailRow label="Emri" value={`${snap.firstName} ${snap.lastName ?? ''}`.trim()} /> : null}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Mesazhi i aplikantit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selected?.message?.trim() || '—'}
              </Typography>
              <TextField
                label="Shënim administratori"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                sx={{ mt: 1 }}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)} color="inherit">
            Mbyll
          </Button>
          {selected?.status === 'pending' ? (
            <>
              <Button color="error" variant="outlined" disabled={acting} onClick={() => void review('reject')}>
                Refuzo
              </Button>
              <Button variant="contained" disabled={acting} onClick={() => void review('approve')}>
                Aprovo
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right', maxWidth: '62%' }}>
        {value}
      </Typography>
    </Stack>
  );
}
