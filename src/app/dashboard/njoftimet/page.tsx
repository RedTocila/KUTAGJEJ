'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { paths } from '@/paths';
import { listAdminListings, reviewAdminListing, type AdminListingRow } from '@/lib/admin-listings-client';
import { useUser } from '@/hooks/use-user';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';

const KIND_OPTIONS = [
  { value: '', label: 'Të gjitha' },
  { value: 'real-estate', label: 'Prona' },
  { value: 'cars', label: 'Makina' },
  { value: 'jobs', label: 'Punë' },
  { value: 'marketplace', label: 'Tregu' },
  { value: 'businesses', label: 'Biznese' },
  { value: 'professionals', label: 'Profesionistë' },
];

function statusChip(status: AdminListingRow['status']) {
  if (status === 'approved') return <Chip size="small" label="Aprovuar" color="success" />;
  if (status === 'rejected') return <Chip size="small" label="Refuzuar" color="error" />;
  return <Chip size="small" label="Në pritje" color="warning" />;
}

export default function ListingModerationPage() {
  const router = useRouter();
  const { user } = useUser();
  const [listings, setListings] = React.useState<AdminListingRow[]>([]);
  const [filter, setFilter] = React.useState<'pending' | 'all'>('pending');
  const [kind, setKind] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AdminListingRow | null>(null);
  const [adminNote, setAdminNote] = React.useState('');
  const [acting, setActing] = React.useState(false);

  const isAdmin = user?.accountType === 'admin' || (!user?.accountType && user?.role === 'admin');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAdminListings(filter === 'pending' ? 'pending' : 'all', kind || undefined);
    if (res.error) setError(res.error);
    else setListings(res.listings ?? []);
    setLoading(false);
  }, [filter, kind]);

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
    const res = await reviewAdminListing(selected.kind, selected.id, decision, adminNote);
    if (res.error) setError(res.error);
    else {
      setSelected(null);
      setAdminNote('');
      await load();
    }
    setActing(false);
  };

  if (!user || !isAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(MegaphoneIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Përmbajtja"
        title="Njoftimet"
        description="Çdo njoftim i ri pret miratimin para se të shfaqet publikisht."
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

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {KIND_OPTIONS.map((opt) => (
          <Chip
            key={opt.value || 'all'}
            label={opt.label}
            color={kind === opt.value ? 'primary' : 'default'}
            variant={kind === opt.value ? 'filled' : 'outlined'}
            onClick={() => setKind(opt.value)}
          />
        ))}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Typography color="text.secondary">Duke ngarkuar…</Typography>
      ) : listings.length === 0 ? (
        <Alert severity="info">Nuk ka njoftime për këtë filtër.</Alert>
      ) : (
        <Grid container spacing={2}>
          {listings.map((row) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${row.kind}-${row.id}`}>
              <Card
                variant="outlined"
                sx={{ height: '100%', cursor: 'pointer' }}
                onClick={() => {
                  setSelected(row);
                  setAdminNote('');
                }}
              >
                {row.imageUrl ? (
                  <CardMedia component="img" height={140} image={row.imageUrl} alt={row.title} sx={{ objectFit: 'cover' }} />
                ) : null}
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip size="small" label={row.kindLabel} />
                      {statusChip(row.status)}
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {row.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.cityName ? `${row.cityName} · ` : ''}
                      {new Date(row.createdAt).toLocaleString('sq-AL')}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Kategoria
              </Typography>
              <Typography>{selected?.kindLabel}</Typography>
            </Box>
            {selected?.cityName ? (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Qyteti
                </Typography>
                <Typography>{selected.cityName}</Typography>
              </Box>
            ) : null}
            {selected?.status === 'pending' ? (
              <TextField
                label="Shënim për përdoruesin (opsional)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
            ) : selected?.adminNote ? (
              <Alert severity="info">Shënim: {selected.adminNote}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Mbyll</Button>
          {selected?.status === 'pending' ? (
            <>
              <Button color="error" disabled={acting} onClick={() => void review('reject')}>
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
