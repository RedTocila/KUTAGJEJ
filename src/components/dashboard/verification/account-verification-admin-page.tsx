'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { paths } from '@/paths';
import {
  listJobEmployerVerificationRequests,
  reviewJobEmployerVerificationRequest,
} from '@/lib/admin-job-employer-verification-client';
import type { JobEmployerVerificationRequest } from '@/lib/job-employer-verification-client';
import {
  listProfessionalVerificationRequests,
  reviewProfessionalVerificationRequest,
} from '@/lib/admin-professional-verification-client';
import { useUser } from '@/hooks/use-user';
import { MOTION } from '@/styles/motion';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

type QueueSource = 'jobs' | 'professionals';

type QueueItem = JobEmployerVerificationRequest & { source: QueueSource };

function statusChip(status: JobEmployerVerificationRequest['status']) {
  if (status === 'approved') return <Chip size="small" label="Aprovuar" color="success" />;
  if (status === 'rejected') return <Chip size="small" label="Refuzuar" color="error" />;
  return <Chip size="small" label="Në pritje" color="warning" />;
}

function reviewBySource(
  source: QueueSource,
  id: string,
  decision: 'approve' | 'reject',
  adminNote?: string,
) {
  return source === 'jobs'
    ? reviewJobEmployerVerificationRequest(id, decision, adminNote)
    : reviewProfessionalVerificationRequest(id, decision, adminNote);
}

export function AccountVerificationAdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [requests, setRequests] = React.useState<QueueItem[]>([]);
  const [filter, setFilter] = React.useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<QueueItem | null>(null);
  const [adminNote, setAdminNote] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [acting, setActing] = React.useState(false);

  const isAdmin = user?.accountType === 'admin' || (!user?.accountType && user?.role === 'admin');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const status = filter === 'pending' ? 'pending' : 'all';
    const [jobs, professionals] = await Promise.all([
      listJobEmployerVerificationRequests(status),
      listProfessionalVerificationRequests(status),
    ]);
    if (jobs.error && professionals.error) {
      setError(jobs.error || professionals.error);
      setRequests([]);
    } else {
      const merged: QueueItem[] = [
        ...(jobs.requests ?? []).map((row) => ({ ...row, source: 'jobs' as const })),
        ...(professionals.requests ?? []).map((row) => ({ ...row, source: 'professionals' as const })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(merged);
      if (jobs.error || professionals.error) setError(jobs.error || professionals.error || null);
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

  const review = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    const trimmedNote = adminNote.replace(/\s+/g, ' ').trim();
    if (decision === 'reject' && !trimmedNote) {
      setDialogError('Shkruani arsyen e refuzimit — ajo i dërgohet përdoruesit.');
      return;
    }
    setActing(true);
    setDialogError(null);
    setError(null);
    const res = await reviewBySource(selected.source, selected.id, decision, trimmedNote);
    if (res.error) {
      setDialogError(res.error);
      setActing(false);
      return;
    }

    const email = selected.applicantSnapshot.email?.toLowerCase();
    const twin = requests.find(
      (row) =>
        row.id !== selected.id &&
        row.source !== selected.source &&
        row.status === 'pending' &&
        row.applicantSnapshot.email?.toLowerCase() === email,
    );
    if (twin) {
      await reviewBySource(twin.source, twin.id, decision, trimmedNote);
    }

    setSelected(null);
    setAdminNote('');
    setDialogError(null);
    setRejectDialogOpen(false);
    await load();
    setActing(false);
  };

  if (!user || !isAdmin) return null;

  const snap = selected?.applicantSnapshot;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(ShieldCheckIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Kategoritë"
        title="Verifikimi"
        description="Një verifikim llogarie për Punëdhënësit dhe Profesionistët."
        actions={
          <>
            <Button variant={filter === 'pending' ? 'contained' : 'outlined'} onClick={() => setFilter('pending')} sx={productButtonSx}>
              Në pritje
            </Button>
            <Button variant={filter === 'all' ? 'contained' : 'outlined'} onClick={() => setFilter('all')} sx={productButtonSx}>
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
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${req.source}-${req.id}`}>
              <Box
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(req);
                  setAdminNote(req.adminNote ?? '');
                  setDialogError(null);
                  setRejectDialogOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(req);
                    setAdminNote(req.adminNote ?? '');
                    setDialogError(null);
                    setRejectDialogOpen(false);
                  }
                }}
                sx={{
                  ...productPanelSx,
                  height: '100%',
                  cursor: 'pointer',
                  p: 2,
                  transition: `border-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}`,
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: (t) => `0 8px 24px ${primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.1)}`,
                  },
                  '&:active': { transform: 'scale(0.99)' },
                }}
              >
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
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <ProductDialog
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setDialogError(null);
          setRejectDialogOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <ProductDialogTitle
          onClose={() => {
            setSelected(null);
            setDialogError(null);
            setRejectDialogOpen(false);
          }}
        >
          Detajet e kërkesës
        </ProductDialogTitle>
        <ProductDialogContent>
          {snap ? (
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>{snap.displayName}</Typography>
              <DetailRow label="Lloji" value={snap.accountKind === 'business' ? 'Biznes' : 'Individ'} />
              <DetailRow label="Email" value={snap.email} />
              <DetailRow label="Telefon" value={snap.phone || '—'} />
              {snap.businessName ? <DetailRow label="Emri i biznesit" value={snap.businessName} /> : null}
              {(selected?.nipt || snap.nipt) ? (
                <DetailRow label="NIPT" value={selected?.nipt || snap.nipt || '—'} />
              ) : null}
              {snap.businessOwner ? <DetailRow label="Pronari" value={snap.businessOwner} /> : null}
              {snap.businessCategory ? <DetailRow label="Kategoria" value={snap.businessCategory} /> : null}
              {snap.firstName ? <DetailRow label="Emri" value={`${snap.firstName} ${snap.lastName ?? ''}`.trim()} /> : null}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Mesazhi i aplikantit (opsional)
              </Typography>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {selected?.message?.trim() || 'Aplikanti nuk la mesazh.'}
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Dokumentet e verifikimit
              </Typography>
              <DetailRow label="Numri i ID-së" value={selected?.idNumber?.trim() || '—'} />
              {selected?.idFrontImageUrl ? (
                <Box
                  sx={{
                    mt: 0.5,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.idFrontImageUrl}
                    alt="Fotoja e përparme e ID-së"
                    style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
                  />
                  <Box sx={{ p: 1 }}>
                    <Button
                      size="small"
                      href={selected.idFrontImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={productButtonSx}
                    >
                      Hap foton
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nuk ka foto ID.
                </Typography>
              )}
              {selected?.status === 'rejected' && selected.adminNote?.trim() ? (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Arsyeja e refuzimit
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selected.adminNote.trim()}
                  </Typography>
                </>
              ) : null}
            </Stack>
          ) : null}
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            onClick={() => {
              setSelected(null);
              setDialogError(null);
              setRejectDialogOpen(false);
            }}
            color="inherit"
            sx={productButtonSx}
          >
            Mbyll
          </Button>
          {selected?.status === 'pending' ? (
            <>
              <Button
                color="error"
                variant="outlined"
                disabled={acting}
                onClick={() => {
                  setAdminNote('');
                  setDialogError(null);
                  setRejectDialogOpen(true);
                }}
                sx={productButtonSx}
              >
                Refuzo
              </Button>
              <Button variant="contained" disabled={acting} onClick={() => void review('approve')} sx={productButtonSx}>
                Aprovo
              </Button>
            </>
          ) : null}
        </ProductDialogActions>
      </ProductDialog>

      <ProductDialog
        open={rejectDialogOpen}
        onClose={() => {
          if (acting) return;
          setRejectDialogOpen(false);
          setDialogError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <ProductDialogTitle
          onClose={() => {
            if (acting) return;
            setRejectDialogOpen(false);
            setDialogError(null);
          }}
        >
          Refuzo kërkesën
        </ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Shkruani arsyen e refuzimit. Kjo i dërgohet përdoruesit si njoftim.
            </Typography>
            {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
            <TextField
              label="Arsyeja e refuzimit"
              value={adminNote}
              onChange={(e) => {
                setAdminNote(e.target.value);
                if (dialogError) setDialogError(null);
              }}
              fullWidth
              multiline
              minRows={3}
              autoFocus
              placeholder="p.sh. Fotoja e ID-së ishte e turbullt — provoni përsëri me më shumë dritë."
              sx={productFieldSx}
            />
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            color="inherit"
            disabled={acting}
            onClick={() => {
              setRejectDialogOpen(false);
              setDialogError(null);
            }}
            sx={productButtonSx}
          >
            Anulo
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={acting}
            onClick={() => void review('reject')}
            sx={productButtonSx}
          >
            {acting ? 'Duke refuzuar…' : 'Konfirmo refuzimin'}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
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
