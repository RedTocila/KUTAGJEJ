'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import {
  createCreditPackage,
  deleteCreditPackage,
  listAdminCreditPackages,
  updateCreditPackage,
} from '@/lib/admin-credit-packages-client';
import type { AdminCreditPackage, CreditPackageInput } from '@/types/payment';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const EMPTY_FORM: CreditPackageInput = {
  credits: 100,
  bonusCredits: 0,
  priceEur: 9,
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
        bonusCredits: initial.bonusCredits || 0,
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
    <ProductDialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={saving ? undefined : onClose}>
        {initial ? 'Ndrysho paketën' : 'Paketë e re Boost Coins'}
      </ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2} sx={{ mt: 0.5, ...productFieldSx }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Boost Coins (bazë BC)"
            type="number"
            value={form.credits}
            onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
            fullWidth
          />
          <TextField
            label="Bonus BC"
            type="number"
            value={form.bonusCredits}
            onChange={(e) => setForm((f) => ({ ...f, bonusCredits: Number(e.target.value) }))}
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
            placeholder="p.sh. Starter"
            value={form.labelSq}
            onChange={(e) => setForm((f) => ({ ...f, labelSq: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Badge (opsional)"
            placeholder="p.sh. +40 BC"
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
      </ProductDialogContent>
      <ProductDialogActions>
        <Button onClick={onClose} disabled={saving} sx={productButtonSx}>
          Anulo
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={productButtonSx}>
          {saving ? 'Po ruhet...' : 'Ruaj'}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
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
      <AdminPageHeader
        icon={<BoostCoinIcon size={22} />}
        eyebrow="Financa"
        title="Boost Coins"
        description="Paketat Boost Coins që shfaqen te dyqani i përdoruesit — blihen për Premium, OKAZION dhe fuqizim njoftimesh."
        actions={
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            sx={productButtonSx}
          >
            Shto paketë
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ ...productPanelSx, overflowX: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <ContentBlockSkeleton rows={5} rowHeight={48} />
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
                <TableCell align="right">BC</TableCell>
                <TableCell align="right">Bonus</TableCell>
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
                  <TableCell align="right">
                    {(p.bonusCredits || 0) > 0
                      ? `+${new Intl.NumberFormat('en-US').format(p.bonusCredits)}`
                      : '0'}
                  </TableCell>
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

      <ProductDialog open={Boolean(deleting)} onClose={deleteBusy ? undefined : () => setDeleting(null)} maxWidth="xs" fullWidth>
        <ProductDialogTitle onClose={deleteBusy ? undefined : () => setDeleting(null)}>Fshi paketën</ProductDialogTitle>
        <ProductDialogContent>
          <Typography>
            A jeni i sigurt që doni të fshini paketën <strong>{deleting?.labelSq}</strong>? Pagesat e
            kaluara nuk preken.
          </Typography>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={() => setDeleting(null)} disabled={deleteBusy} sx={productButtonSx}>
            Anulo
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteBusy}
            sx={productButtonSx}
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
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
