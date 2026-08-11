'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
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
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import {
  createAddonPackage,
  deactivateAddonPackage,
  listAdminAddonPackages,
  updateAddonPackage,
} from '@/lib/admin-addon-packages-client';
import { OKAZION_ACCENT } from '@/lib/home-categories';
import type { AddonKind, AddonPackage, AddonPackageInput } from '@/types/addon-package';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const KIND_ORDER: AddonKind[] = ['premium', 'auto-refresh', 'okazion'];

const KIND_META: Record<
  AddonKind,
  { title: string; blurb: string; accent: string; Icon: React.ElementType }
> = {
  premium: {
    title: 'Premium',
    blurb: 'Voucherë Premium që blihen dhe aplikohen te njoftimet.',
    accent: '#fb9c0c',
    Icon: SparkleIcon,
  },
  'auto-refresh': {
    title: 'Auto-Refresh',
    blurb: 'Slotet për rifreskim automatik të njoftimeve.',
    accent: '#3b82f6',
    Icon: ArrowClockwiseIcon,
  },
  okazion: {
    title: 'OKAZION',
    blurb: 'Oferta të shkurtra OKAZION (zakonisht 5 ditë).',
    accent: OKAZION_ACCENT,
    Icon: SealPercentIcon,
  },
};

function emptyForm(kind: AddonKind): AddonPackageInput {
  if (kind === 'auto-refresh') {
    return {
      kind,
      slots: 10,
      days: null,
      priceEur: 14,
      priceBc: 150,
      labelSq: '',
      labelEn: '',
      active: true,
      sortOrder: 0,
    };
  }
  if (kind === 'okazion') {
    return {
      kind,
      days: 5,
      slots: null,
      priceEur: 12,
      priceBc: 200,
      labelSq: '',
      labelEn: '',
      active: true,
      sortOrder: 0,
    };
  }
  return {
    kind,
    days: 15,
    slots: null,
    priceEur: 18,
    priceBc: 200,
    labelSq: '',
    labelEn: '',
    active: true,
    sortOrder: 0,
  };
}

function AddonDialog({
  open,
  initial,
  defaultKind,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: AddonPackage | null;
  defaultKind: AddonKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<AddonPackageInput>(emptyForm(defaultKind));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const kind = initial?.kind ?? form.kind;

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        kind: initial.kind,
        days: initial.days,
        slots: initial.slots,
        priceEur: initial.priceEur,
        priceBc: initial.priceBc,
        labelSq: initial.labelSq,
        labelEn: initial.labelEn || '',
        active: initial.active,
        sortOrder: initial.sortOrder,
      });
    } else {
      setForm(emptyForm(defaultKind));
    }
  }, [open, initial, defaultKind]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const label = form.labelSq.trim() || KIND_META[kind].title;
    const body: AddonPackageInput = { ...form, kind, labelSq: label };
    const res = initial
      ? await updateAddonPackage(initial.id, body)
      : await createAddonPackage(body);
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
        {initial ? `Ndrysho · ${KIND_META[kind].title}` : 'Paketë shtesë e re'}
      </ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {error}
            </Alert>
          ) : null}

          {!initial ? (
            <FormControl fullWidth size="small" sx={productFieldSx}>
              <InputLabel id="addon-kind-label">Lloji</InputLabel>
              <Select
                labelId="addon-kind-label"
                label="Lloji"
                value={form.kind}
                onChange={(e) => {
                  const next = e.target.value as AddonKind;
                  setForm(emptyForm(next));
                }}
              >
                {KIND_ORDER.map((k) => (
                  <MenuItem key={k} value={k}>
                    {KIND_META[k].title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          <TextField
            label="Etiketa (SQ)"
            value={form.labelSq}
            onChange={(e) => setForm((f) => ({ ...f, labelSq: e.target.value }))}
            fullWidth
            size="small"
            placeholder={
              kind === 'auto-refresh'
                ? 'p.sh. 10 njoftime Auto-Refresh'
                : kind === 'okazion'
                  ? 'p.sh. 5 ditë OKAZION'
                  : 'p.sh. 15 ditë Premium'
            }
            sx={productFieldSx}
          />
          <TextField
            label="Etiketa (EN, opsionale)"
            value={form.labelEn || ''}
            onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
            fullWidth
            size="small"
            sx={productFieldSx}
          />
          {kind === 'auto-refresh' ? (
            <TextField
              label="Slotet"
              type="number"
              value={form.slots ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, slots: Number(e.target.value) }))}
              fullWidth
              size="small"
              sx={productFieldSx}
            />
          ) : (
            <TextField
              label="Ditët"
              type="number"
              value={form.days ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
              fullWidth
              size="small"
              sx={productFieldSx}
            />
          )}
          <Stack direction="row" spacing={1.5}>
            <TextField
              label="Çmimi EUR"
              type="number"
              value={form.priceEur}
              onChange={(e) => setForm((f) => ({ ...f, priceEur: Number(e.target.value) }))}
              fullWidth
              size="small"
              sx={productFieldSx}
            />
            <TextField
              label="Çmimi BC"
              type="number"
              value={form.priceBc}
              onChange={(e) => setForm((f) => ({ ...f, priceBc: Number(e.target.value) }))}
              fullWidth
              size="small"
              sx={productFieldSx}
            />
          </Stack>
          <TextField
            label="Renditja"
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            fullWidth
            size="small"
            sx={productFieldSx}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.active)}
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
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving} sx={productButtonSx}>
          {saving ? 'Po ruhet…' : 'Ruaj'}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}

function KindSection({
  kind,
  packages,
  onAdd,
  onEdit,
  onDeactivate,
}: {
  kind: AddonKind;
  packages: AddonPackage[];
  onAdd: () => void;
  onEdit: (pkg: AddonPackage) => void;
  onDeactivate: (pkg: AddonPackage) => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;

  return (
    <Box sx={{ ...productPanelSx, overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          px: 2.5,
          py: 2,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'action.hover'),
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.25,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: `${meta.accent}22`,
              color: meta.accent,
            }}
          >
            {React.createElement(Icon, { size: 22, weight: 'duotone' })}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 800 }}>{meta.title}</Typography>
              <Chip size="small" label={`${packages.length}`} sx={{ fontWeight: 700, height: 22 }} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {meta.blurb}
            </Typography>
          </Box>
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PlusIcon size={16} />}
          onClick={onAdd}
          sx={productButtonSx}
        >
          Shto
        </Button>
      </Stack>

      {packages.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
          Nuk ka paketa në këtë kategori.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'text.secondary',
                  },
                }}
              >
                <TableCell>Etiketa</TableCell>
                <TableCell>{kind === 'auto-refresh' ? 'Slotet' : 'Ditët'}</TableCell>
                <TableCell align="right">EUR</TableCell>
                <TableCell align="right">BC</TableCell>
                <TableCell align="center">Statusi</TableCell>
                <TableCell align="right" width={110}>
                  Veprime
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} hover sx={{ opacity: pkg.active ? 1 : 0.55 }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {pkg.labelSq}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {pkg.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {kind === 'auto-refresh' ? `${pkg.slots ?? '—'} slot` : `${pkg.days ?? '—'} ditë`}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {pkg.priceEur} €
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                      <BoostCoinIcon size={14} />
                      <span>{pkg.priceBc}</span>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={pkg.active ? 'success' : 'default'}
                      label={pkg.active ? 'Aktive' : 'Fshehur'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="Ndrysho"
                      onClick={() => onEdit(pkg)}
                    >
                      <PencilIcon size={18} />
                    </IconButton>
                    {pkg.active ? (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Çaktivizo"
                        onClick={() => onDeactivate(pkg)}
                      >
                        <TrashIcon size={18} />
                      </IconButton>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

type AddonPackagesAdminSectionProps = { kind?: AddonKind };

export function AddonPackagesAdminSection({ kind }: AddonPackagesAdminSectionProps = {}) {
  const [packages, setPackages] = React.useState<AddonPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AddonPackage | null>(null);
  const [defaultKind, setDefaultKind] = React.useState<AddonKind>(kind ?? 'premium');
  const [deactivating, setDeactivating] = React.useState<AddonPackage | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listAdminAddonPackages(kind);
    if (res.error) setError(res.error);
    else setPackages(res.packages ?? []);
    setLoading(false);
  }, [kind]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const byKind = React.useMemo(() => {
    const map: Record<AddonKind, AddonPackage[]> = {
      premium: [],
      'auto-refresh': [],
      okazion: [],
    };
    for (const pkg of packages) {
      if (map[pkg.kind]) map[pkg.kind].push(pkg);
    }
    return map;
  }, [packages]);

  const kindsToShow = kind ? [kind] : KIND_ORDER;

  const openCreate = (k: AddonKind) => {
    setEditing(null);
    setDefaultKind(k);
    setDialogOpen(true);
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800 }}>Paketat shtesë</Typography>
          <Typography variant="body2" color="text.secondary">
            Të njëjtat paketa që shfaqen te dyqani i përdoruesit (Premium, Auto-Refresh, OKAZION).
          </Typography>
        </Box>
        {!kind ? (
          <Button
            variant="contained"
            startIcon={<PlusIcon size={18} />}
            onClick={() => openCreate('premium')}
            sx={productButtonSx}
          >
            Shto paketë
          </Button>
        ) : null}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        kindsToShow.map((k) => (
          <KindSection
            key={k}
            kind={k}
            packages={byKind[k]}
            onAdd={() => openCreate(k)}
            onEdit={(pkg) => {
              setEditing(pkg);
              setDefaultKind(pkg.kind);
              setDialogOpen(true);
            }}
            onDeactivate={setDeactivating}
          />
        ))
      )}

      <AddonDialog
        open={dialogOpen}
        initial={editing}
        defaultKind={defaultKind}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => {
          setDialogOpen(false);
          setEditing(null);
          await load();
        }}
      />

      <ProductDialog
        open={Boolean(deactivating)}
        onClose={deleteBusy ? undefined : () => setDeactivating(null)}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={deleteBusy ? undefined : () => setDeactivating(null)}>
          Çaktivizo paketën?
        </ProductDialogTitle>
        <ProductDialogContent>
          <Typography variant="body2" color="text.secondary">
            Paketa{' '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {deactivating?.labelSq}
            </Box>{' '}
            do të fshihet nga dyqani. Voucherët ekzistues nuk preken — mund ta riaktivizosh duke e
            ndryshuar.
          </Typography>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={() => setDeactivating(null)} disabled={deleteBusy} sx={productButtonSx}>
            Anulo
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteBusy}
            sx={productButtonSx}
            onClick={() => {
              void (async () => {
                if (!deactivating) return;
                setDeleteBusy(true);
                const res = await deactivateAddonPackage(deactivating.id);
                setDeleteBusy(false);
                if (res.error) {
                  setError(res.error);
                  return;
                }
                setDeactivating(null);
                await load();
              })();
            }}
          >
            {deleteBusy ? 'Po çaktivizohet…' : 'Çaktivizo'}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}
