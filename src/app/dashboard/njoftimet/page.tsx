'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';

import { paths } from '@/paths';
import { listAdminListings, reviewAdminListing, type AdminListingRow } from '@/lib/admin-listings-client';
import { useUser } from '@/hooks/use-user';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { MOTION } from '@/styles/motion';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

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
  if (status === 'approved') return <Chip size="small" label="Aktive" color="success" sx={{ fontWeight: 700 }} />;
  if (status === 'rejected') return <Chip size="small" label="Hequr" color="error" sx={{ fontWeight: 700 }} />;
  return <Chip size="small" label="Në shqyrtim" color="warning" sx={{ fontWeight: 700 }} />;
}

export default function ListingModerationPage() {
  const router = useRouter();
  const { user } = useUser();
  const [listings, setListings] = React.useState<AdminListingRow[]>([]);
  const [filter, setFilter] = React.useState<'pending' | 'all'>('all');
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
        description="Njoftimet publikohen menjëherë. Hiqi ose rivendosi këtu nëse shkelin rregullat."
        actions={
          <>
            <Button
              variant={filter === 'all' ? 'contained' : 'outlined'}
              onClick={() => setFilter('all')}
              sx={productButtonSx}
            >
              Të gjitha
            </Button>
            <Button
              variant={filter === 'pending' ? 'contained' : 'outlined'}
              onClick={() => setFilter('pending')}
              sx={productButtonSx}
            >
              Hequr / shqyrtim
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
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          />
        ))}
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Typography color="text.secondary">Duke ngarkuar…</Typography>
      ) : listings.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          Nuk ka njoftime për këtë filtër.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {listings.map((row) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${row.kind}-${row.id}`}>
              <Box
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(row);
                  setAdminNote('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(row);
                    setAdminNote('');
                  }
                }}
                sx={{
                  ...productPanelSx,
                  height: '100%',
                  cursor: 'pointer',
                  transition: `border-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}`,
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    boxShadow: (t) => `0 8px 24px ${primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.1)}`,
                  },
                  '&:active': { transform: 'scale(0.99)' },
                }}
              >
                {row.imageUrl ? (
                  <Box
                    component="img"
                    src={row.imageUrl}
                    alt={row.title}
                    sx={{
                      display: 'block',
                      width: '100%',
                      height: { xs: 150, md: 160 },
                      objectFit: 'cover',
                      bgcolor: 'action.hover',
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: { xs: 150, md: 160 },
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.12 : 0.08),
                      color: 'primary.main',
                    }}
                  >
                    {React.createElement(MegaphoneIcon, { size: 28, weight: 'duotone' })}
                  </Box>
                )}
                <Box sx={{ p: 1.75 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      <Chip size="small" label={row.kindLabel} sx={{ fontWeight: 600 }} />
                      {statusChip(row.status)}
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                      {row.cityName ? `${row.cityName} · ` : ''}
                      {new Date(row.createdAt).toLocaleString('sq-AL')}
                    </Typography>
                  </Stack>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <ProductDialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <ProductDialogTitle onClose={() => setSelected(null)}>{selected?.title}</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {selected ? statusChip(selected.status) : null}
              {selected?.kindLabel ? <Chip size="small" label={selected.kindLabel} /> : null}
            </Stack>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Kategoria
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{selected?.kindLabel}</Typography>
            </Box>
            {selected?.cityName ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Qyteti
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{selected.cityName}</Typography>
              </Box>
            ) : null}
            {selected?.status === 'approved' || selected?.status === 'pending' || selected?.status === 'rejected' ? (
              <TextField
                label="Shënim për përdoruesin (opsional)"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                sx={productFieldSx}
              />
            ) : selected?.adminNote ? (
              <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                Shënim: {selected.adminNote}
              </Alert>
            ) : null}
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={() => setSelected(null)} sx={productButtonSx}>
            Mbyll
          </Button>
          {selected?.status === 'approved' || selected?.status === 'pending' ? (
            <Button color="error" variant="outlined" disabled={acting} onClick={() => void review('reject')} sx={productButtonSx}>
              Hiq nga publikimi
            </Button>
          ) : null}
          {selected?.status === 'rejected' || selected?.status === 'pending' ? (
            <Button variant="contained" disabled={acting} onClick={() => void review('approve')} sx={productButtonSx}>
              {selected?.status === 'rejected' ? 'Rivendos' : 'Publiko'}
            </Button>
          ) : null}
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
