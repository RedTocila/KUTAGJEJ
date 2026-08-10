'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { paths } from '@/paths';
import {
  createRealEstateCity,
  deleteRealEstateCity,
  listRealEstateLocationsAdmin,
  updateRealEstateCity,
  type RealEstateCityDto,
} from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

function zonesFromLines(text: string): { name: string; slug?: string }[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}

function linesFromZones(zones: { name: string }[]): string {
  return zones.map((z) => z.name).join('\n');
}

export default function RealEstateLocationsAdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RealEstateCityDto | null>(null);
  const [cityName, setCityName] = React.useState('');
  const [citySlug, setCitySlug] = React.useState('');
  const [zonesText, setZonesText] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { cities: list, error } = await listRealEstateLocationsAdmin();
    if (error) {
      setLoadError(error);
      setCities([]);
    } else {
      setCities(list ?? []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    if (!isPlatformAdmin) {
      router.replace(paths.dashboard.overview);
      return;
    }
    void load();
  }, [user, router, isPlatformAdmin, load]);

  const openCreate = () => {
    setEditing(null);
    setCityName('');
    setCitySlug('');
    setZonesText('');
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (c: RealEstateCityDto) => {
    setEditing(c);
    setCityName(c.name);
    setCitySlug(c.slug);
    setZonesText(linesFromZones(c.zones));
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const saveCity = async () => {
    setFormError(null);
    const name = cityName.trim();
    if (!name) {
      setFormError('Emri i qytetit është i detyrueshëm.');
      return;
    }
    const zones = zonesFromLines(zonesText);
    if (zones.length === 0) {
      setFormError('Shtoni të paktën një zonë (një për rresht).');
      return;
    }
    setPending(true);
    try {
      if (editing) {
        const { error } = await updateRealEstateCity(editing.id, {
          name,
          slug: citySlug.trim() || undefined,
          zones,
        });
        if (error) {
          setFormError(error);
          return;
        }
      } else {
        const { error } = await createRealEstateCity({
          name,
          slug: citySlug.trim() || undefined,
          zones,
        });
        if (error) {
          setFormError(error);
          return;
        }
      }
      closeDialog();
      await load();
    } finally {
      setPending(false);
    }
  };

  const onDelete = async (c: RealEstateCityDto) => {
    if (!window.confirm(`Fshini qytetin «${c.name}» dhe të gjitha zonat e tij?`)) return;
    const { error } = await deleteRealEstateCity(c.id);
    if (error) {
      setLoadError(error);
      return;
    }
    setCities((prev) => prev.filter((x) => x.id !== c.id));
  };

  if (!user) return null;
  if (!isPlatformAdmin) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <AdminPageHeader
        icon={React.createElement(MapPinIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Përmbajtja"
        title="Vendndodhjet"
        description="Qytetet dhe zonat për dropdown-et e formës së pronave. Një zonë për rresht kur redaktoni."
        actions={
          <Button variant="contained" startIcon={React.createElement(PlusIcon, { size: 20 })} onClick={openCreate} sx={productButtonSx}>
            Shto qytet
          </Button>
        }
      />

      {loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <Box sx={productPanelSx}>
        <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Qyteti</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Zonat</TableCell>
                  <TableCell align="right" width={120} sx={{ fontWeight: 700 }}>
                    Veprime
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Duke u ngarkuar…</TableCell>
                  </TableRow>
                ) : cities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        Nuk ka ende qytete. Shtoni Tiranë, Durrës, etj., pastaj listoni zonat një për rresht.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  cities.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{c.slug}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {c.zones.length === 0 ? '—' : c.zones.map((z) => z.name).join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton aria-label="Ndrysho" size="small" onClick={() => openEdit(c)} color="primary">
                          {React.createElement(PencilSimpleIcon, { size: 20 })}
                        </IconButton>
                        <IconButton aria-label="Fshi" size="small" onClick={() => void onDelete(c)} color="error">
                          {React.createElement(TrashIcon, { size: 20 })}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
      </Box>

      <ProductDialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <ProductDialogTitle onClose={closeDialog}>{editing ? 'Ndrysho qytetin' : 'Shto qytet'}</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: { sm: 420 }, ...productFieldSx }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <TextField label="Emri i qytetit" value={cityName} onChange={(e) => setCityName(e.target.value)} required fullWidth />
            <TextField
              label="Slug (opsionale)"
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
              fullWidth
              helperText="Lëreni bosh për ta gjeneruar automatikisht."
            />
            <TextField
              label="Zonat"
              value={zonesText}
              onChange={(e) => setZonesText(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              helperText="Një zonë për rresht."
            />
          </Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={closeDialog} disabled={pending} sx={productButtonSx}>
            Anulo
          </Button>
          <Button variant="contained" onClick={() => void saveCity()} disabled={pending} sx={productButtonSx}>
            {pending ? 'Duke ruajtur…' : 'Ruaj'}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Box>
  );
}
