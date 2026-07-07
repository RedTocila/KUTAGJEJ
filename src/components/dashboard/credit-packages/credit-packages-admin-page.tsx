'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import {
  createCreditPackage,
  deleteCreditPackage,
  listAdminCreditPackages,
  updateCreditPackage,
} from '@/lib/admin-credit-packages-client';
import type { AdminCreditPackage, CreditPackageInput } from '@/types/payment';

const EMPTY_FORM: CreditPackageInput = {
  credits: 100,
  priceEur: 5,
  labelSq: '',
  badgeSq: '',
  active: true,
  sortOrder: 0,
};

function PackageDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: AdminCreditPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<CreditPackageInput>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        credits: initial.credits,
        priceEur: initial.priceEur,
        labelSq: initial.labelSq,
        badgeSq: initial.badgeSq || '',
        active: initial.active,
        sortOrder: initial.sortOrder,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const label = form.labelSq.trim() || `${form.credits} kredite`;
    const body: CreditPackageInput = { ...form, labelSq: label };
    const res = initial
      ? await updateCreditPackage(initial.id, body)
      : await createCreditPackage(body);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved();
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {initial ? 'Ndrysho paketën' : 'Paketë e re krediti'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Kredite"
            type="number"
            value={form.credits}
            onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
            fullWidth
          />
          <TextField
            label="Çmimi (EUR)"
            type="number"
            value={form.priceEur}
            onChange={(e) => setForm((f) => ({ ...f, priceEur: Number(e.target.value) }))}
            fullWidth
          />
          <TextField
            label="Etiketa"
            placeholder="p.sh. 250 kredite"
            value={form.labelSq}
            onChange={(e) => setForm((f) => ({ ...f, labelSq: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Badge (opsional)"
            placeholder="p.sh. Popullore"
            value={form.badgeSq}
            onChange={(e) => setForm((f) => ({ ...f, badgeSq: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Renditja"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
            }
            label="Aktive (e dukshme në dyqan)"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Anulo
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Po ruhet...' : 'Ruaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function CreditPackagesAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [packages, setPackages] = React.useState<AdminCreditPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminCreditPackage | null>(null);
  const [deleting, setDeleting] = React.useState<AdminCreditPackage | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { packages: pkgs, error: err } = await listAdminCreditPackages();
    if (err) setError(err);
    else setPackages(pkgs ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void load();
  }, [user, isPlatformAdmin, load]);

  if (!user || !isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Paketat e krediteve
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paketat që përdoruesit blejnë te “Bli kredite”.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlusIcon />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Shto paketë
        </Button>
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
        ) : packages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            Nuk ka ende paketa. Shtoni një.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Etiketa</TableCell>
                <TableCell align="right">Kredite</TableCell>
                <TableCell align="right">Çmimi</TableCell>
                <TableCell>Badge</TableCell>
                <TableCell align="center">Statusi</TableCell>
                <TableCell align="right">Veprime</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{p.labelSq}</TableCell>
                  <TableCell align="right">{new Intl.NumberFormat('en-US').format(p.credits)}</TableCell>
                  <TableCell align="right">{p.priceEur} €</TableCell>
                  <TableCell>{p.badgeSq || '—'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={p.active ? 'success' : 'default'}
                      label={p.active ? 'Aktive' : 'Joaktive'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(p);
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleting(p)}>
                      <TrashIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <PackageDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void load();
        }}
      />

      <Dialog open={Boolean(deleting)} onClose={deleteBusy ? undefined : () => setDeleting(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Fshi paketën</DialogTitle>
        <DialogContent dividers>
          <Typography>
            A jeni i sigurt që doni të fshini paketën <strong>{deleting?.labelSq}</strong>? Pagesat e
            kaluara nuk preken.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleting(null)} disabled={deleteBusy}>
            Anulo
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteBusy}
            onClick={async () => {
              if (!deleting) return;
              setDeleteBusy(true);
              const res = await deleteCreditPackage(deleting.id);
              setDeleteBusy(false);
              if (!res.error) {
                setDeleting(null);
                void load();
              }
            }}
          >
            {deleteBusy ? 'Po fshihet...' : 'Fshi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
