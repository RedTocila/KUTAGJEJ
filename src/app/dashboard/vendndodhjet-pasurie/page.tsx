'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
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
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

import { paths } from '@/paths';
import {
  createRealEstateCity,
  deleteRealEstateCity,
  listRealEstateLocationsAdmin,
  updateRealEstateCity,
  type RealEstateCityDto,
} from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';

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
      setFormError('City name is required.');
      return;
    }
    const zones = zonesFromLines(zonesText);
    if (zones.length === 0) {
      setFormError('Add at least one zone (one per line).');
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
    if (!window.confirm(`Delete city «${c.name}» and all its zones?`)) return;
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
      <Paper
        elevation={0}
        sx={{
          overflow: 'hidden',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3 },
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: '0.12em', color: 'primary.main', fontWeight: 700 }}>
          Pasuri të paluajtshme
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
          Cities & zones
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
          These locations power the city and zone dropdowns on the user real-estate listing form (English UI). Use one
          zone per line when editing.
        </Typography>
        <Button sx={{ mt: 2 }} variant="contained" startIcon={React.createElement(PlusIcon, { size: 20 })} onClick={openCreate}>
          Add city
        </Button>
      </Paper>

      {loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>City</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Zones</TableCell>
                  <TableCell align="right" width={120} sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading…</TableCell>
                  </TableRow>
                ) : cities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No cities yet. Add Tirana, Durrës, etc., then list zones (neighbourhoods) one per line.
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
                        <IconButton aria-label="Edit" size="small" onClick={() => openEdit(c)} color="primary">
                          {React.createElement(PencilSimpleIcon, { size: 20 })}
                        </IconButton>
                        <IconButton aria-label="Delete" size="small" onClick={() => void onDelete(c)} color="error">
                          {React.createElement(TrashIcon, { size: 20 })}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{editing ? 'Edit city' : 'Add city'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError ? (
              <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                {formError}
              </Alert>
            ) : null}
            <TextField label="City name" value={cityName} onChange={(e) => setCityName(e.target.value)} required fullWidth />
            <TextField
              label="City slug (optional)"
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
              fullWidth
              helperText="Lowercase, Latin letters and hyphens. Leave empty to derive from the name."
            />
            <TextField
              label="Zones"
              value={zonesText}
              onChange={(e) => setZonesText(e.target.value)}
              required
              fullWidth
              multiline
              minRows={6}
              placeholder={'Blloku\n21 Dhjetori\nLapraka'}
              helperText="One zone (area / neighbourhood) per line."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void saveCity()} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
