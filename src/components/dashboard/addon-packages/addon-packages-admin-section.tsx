'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Switch,
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
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { AddonKind, AddonPackage, AddonPackageInput } from '@/types/addon-package';
import { MOTION } from '@/styles/motion';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

const KIND_META: Record<
  AddonKind,
  { title: string; blurb: string; accent: string; Icon: React.ElementType }
> = {
  'auto-refresh': {
    title: 'Auto-Refresh',
    blurb: 'Slotet për rifreskim automatik të njoftimeve.',
    accent: '#3b82f6',
    Icon: ArrowClockwiseIcon,
  },
  premium: {
    title: 'Premium',
    blurb: 'Voucherë Premium që përdoruesit i blejnë dhe i aplikojnë te njoftimet.',
    accent: '#fb9c0c',
    Icon: SparkleIcon,
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
  kind,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: AddonKind;
  initial: AddonPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<AddonPackageInput>(emptyForm(kind));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      setForm(emptyForm(kind));
    }
  }, [open, initial, kind]);

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
        {initial ? `Ndrysho · ${KIND_META[kind].title}` : `Paketë e re · ${KIND_META[kind].title}`}
      </ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Etiketa (SQ)"
            value={form.labelSq}
            onChange={(e) => setForm((f) => ({ ...f, labelSq: e.target.value }))}
            fullWidth
            sx={productFieldSx}
          />
          <TextField
            label="Etiketa (EN, opsionale)"
            value={form.labelEn || ''}
            onChange={(e) => setForm((f) => ({ ...f, labelEn: e.target.value }))}
            fullWidth
            sx={productFieldSx}
          />
          {kind === 'auto-refresh' ? (
            <TextField
              label="Slotet"
              type="number"
              value={form.slots ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, slots: Number(e.target.value) }))}
              fullWidth
              sx={productFieldSx}
            />
          ) : (
            <TextField
              label="Ditët"
              type="number"
              value={form.days ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
              fullWidth
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
              sx={productFieldSx}
            />
            <TextField
              label="Çmimi BC"
              type="number"
              value={form.priceBc}
              onChange={(e) => setForm((f) => ({ ...f, priceBc: Number(e.target.value) }))}
              fullWidth
              sx={productFieldSx}
            />
          </Stack>
          <TextField
            label="Renditja"
            type="number"
            value={form.sortOrder ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            fullWidth
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

function PackageCard({
  pkg,
  accent,
  onEdit,
  onDeactivate,
}: {
  pkg: AddonPackage;
  accent: string;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  return (
    <Box
      sx={{
        ...productPanelSx,
        p: 2.25,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        opacity: pkg.active ? 1 : 0.55,
        transition: `border-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}`,
        '&:hover': {
          borderColor: accent,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }} noWrap>
            {pkg.labelSq}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {pkg.id}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={pkg.active ? 'Aktive' : 'Fshehur'}
          color={pkg.active ? 'success' : 'default'}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {pkg.kind === 'auto-refresh' ? (
          <Chip size="small" label={`${pkg.slots} slot`} sx={{ fontWeight: 700, borderRadius: '8px' }} />
        ) : (
          <Chip size="small" label={`${pkg.days} ditë`} sx={{ fontWeight: 700, borderRadius: '8px' }} />
        )}
        <Chip
          size="small"
          label={`${pkg.priceEur} €`}
          sx={{ fontWeight: 800, borderRadius: '8px', bgcolor: primaryMainAlpha(0.12), color: 'primary.main' }}
        />
        <Chip
          size="small"
          icon={<BoostCoinIcon size={14} />}
          label={`${pkg.priceBc} BC`}
          sx={{ fontWeight: 700, borderRadius: '8px' }}
        />
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ mt: 'auto', pt: 0.5 }}>
        <Button size="small" startIcon={<PencilIcon size={16} />} onClick={onEdit} sx={productButtonSx}>
          Ndrysho
        </Button>
        {pkg.active ? (
          <IconButton
            size="small"
            color="error"
            aria-label="Çaktivizo"
            onClick={onDeactivate}
            sx={{ borderRadius: 2 }}
          >
            <TrashIcon size={18} />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  );
}

export function AddonPackagesAdminSection({ kind }: { kind: AddonKind }) {
  const meta = KIND_META[kind];
  const [packages, setPackages] = React.useState<AddonPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AddonPackage | null>(null);

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

  const Icon = meta.Icon;

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
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
            <Typography sx={{ fontWeight: 800 }}>{meta.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {meta.blurb}
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="contained"
          startIcon={<PlusIcon size={18} />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          sx={productButtonSx}
        >
          Shto paketë
        </Button>
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
      ) : packages.length === 0 ? (
        <Box sx={{ ...productPanelSx, p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Nuk ka ende paketa për këtë kategori.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {packages.map((pkg) => (
            <Grid key={pkg.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <PackageCard
                pkg={pkg}
                accent={meta.accent}
                onEdit={() => {
                  setEditing(pkg);
                  setDialogOpen(true);
                }}
                onDeactivate={() => {
                  void (async () => {
                    const res = await deactivateAddonPackage(pkg.id);
                    if (res.error) setError(res.error);
                    else await load();
                  })();
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <AddonDialog
        open={dialogOpen}
        kind={kind}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={async () => {
          setDialogOpen(false);
          setEditing(null);
          await load();
        }}
      />
    </Stack>
  );
}
