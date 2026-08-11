'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { ProductDialog } from '@/components/core/product-dialog';
import type { Contract, ContractPlanCode } from '@/types/contract';
import type { Role } from '@/types/role';
import { productButtonSx, productDialogCloseButtonSx, productFieldSx } from '@/styles/product-sx';
import { createContract, updateContract } from '@/lib/admin-contracts-client';

const PLAN_OPTIONS: { value: ContractPlanCode; label: string }[] = [
  { value: 'free', label: 'FREE' },
  { value: 'starter', label: 'STARTER' },
  { value: 'grow', label: 'GROW' },
  { value: 'elite', label: 'ELITE' },
];

const ROLE_BY_AUDIENCE: Record<'agent' | 'company', string> = {
  agent: 'Individual',
  company: 'Biznes',
};

function QuotaField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextField
      label={props.label}
      type="number"
      value={props.value}
      onChange={(ev) => props.onChange(ev.target.value)}
      fullWidth
      size="small"
      slotProps={{ input: { inputProps: { min: 0, step: 1 } } }}
      sx={productFieldSx}
    />
  );
}

function resolveRoleIds(roles: Role[], kind: 'agent' | 'company', current: string[]): string[] {
  const wanted = ROLE_BY_AUDIENCE[kind].toLowerCase();
  const match = roles.find((r) => r.name.trim().toLowerCase() === wanted);
  if (match) return [match.id];
  return current;
}

export function ContractFormDialog(props: {
  open?: boolean;
  contract?: Contract | null;
  onClose: () => void;
  roles: Role[];
  onSaved: () => void | Promise<void>;
}) {
  const theme = useTheme();
  const isEdit = Boolean(props.contract);
  const open = isEdit ? Boolean(props.contract) : Boolean(props.open);
  const infoMain = theme.palette.info.main;

  const [subscriberKind, setSubscriberKind] = React.useState<'agent' | 'company'>('agent');
  const [planCode, setPlanCode] = React.useState<ContractPlanCode>('starter');
  const [refreshEveryHours, setRefreshEveryHours] = React.useState('48');
  const [glowBadgeEnabled, setGlowBadgeEnabled] = React.useState(false);
  const [boostCredits, setBoostCredits] = React.useState('0');
  const [dailyBoostAccess, setDailyBoostAccess] = React.useState(false);
  const [maxListAllCategories, setMaxListAllCategories] = React.useState('1');
  const [maxJobListings, setMaxJobListings] = React.useState('0');
  const [maxCarListings, setMaxCarListings] = React.useState('0');
  const [maxApartmentListings, setMaxApartmentListings] = React.useState('0');
  const [maxProductListings, setMaxProductListings] = React.useState('0');
  const [maxPremiumListings, setMaxPremiumListings] = React.useState('0');
  const [maxOkazionListings, setMaxOkazionListings] = React.useState('0');
  const [price1Month, setPrice1Month] = React.useState('');
  const [price3Months, setPrice3Months] = React.useState('');
  const [price6Months, setPrice6Months] = React.useState('');
  const [price12Months, setPrice12Months] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [roleIds, setRoleIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (props.contract) {
      const kind = props.contract.subscriberKind === 'company' ? 'company' : 'agent';
      setSubscriberKind(kind);
      setPlanCode((props.contract.planCode as ContractPlanCode) || 'starter');
      setRefreshEveryHours(String(props.contract.refreshEveryHours ?? 48));
      setGlowBadgeEnabled(Boolean(props.contract.glowBadgeEnabled));
      setBoostCredits(String(props.contract.boostCredits ?? 0));
      setDailyBoostAccess(Boolean(props.contract.dailyBoostAccess));
      setMaxListAllCategories(String(props.contract.maxListAllCategories ?? 0));
      setMaxJobListings(String(props.contract.maxJobListings ?? 0));
      setMaxCarListings(String(props.contract.maxCarListings ?? 0));
      setMaxApartmentListings(String(props.contract.maxApartmentListings ?? 0));
      setMaxProductListings(String(props.contract.maxProductListings ?? 0));
      setMaxPremiumListings(String(props.contract.maxPremiumListings ?? 0));
      setMaxOkazionListings(String(props.contract.maxOkazionListings ?? 0));
      setPrice1Month(String(props.contract.price1Month ?? ''));
      setPrice3Months(String(props.contract.price3Months ?? ''));
      setPrice6Months(String(props.contract.price6Months ?? ''));
      setPrice12Months(String(props.contract.price12Months ?? ''));
      setTitle(props.contract.title);
      setContent(props.contract.content ?? '');
      setRoleIds(
        props.contract.roles.length > 0
          ? props.contract.roles.map((r) => r.id)
          : resolveRoleIds(props.roles, kind, []),
      );
    } else {
      setSubscriberKind('agent');
      setPlanCode('starter');
      setRefreshEveryHours('48');
      setGlowBadgeEnabled(false);
      setBoostCredits('0');
      setDailyBoostAccess(false);
      setMaxListAllCategories('1');
      setMaxJobListings('10');
      setMaxCarListings('5');
      setMaxApartmentListings('10');
      setMaxProductListings('5');
      setMaxPremiumListings('0');
      setMaxOkazionListings('0');
      setPrice1Month('14');
      setPrice3Months('');
      setPrice6Months('');
      setPrice12Months('');
      setTitle('STARTER');
      setContent('');
      setRoleIds(resolveRoleIds(props.roles, 'agent', []));
    }
    setError(null);
  }, [open, props.contract, props.roles]);

  const setAudience = (kind: 'agent' | 'company') => {
    setSubscriberKind(kind);
    setRoleIds(resolveRoleIds(props.roles, kind, roleIds));
  };

  const setPlan = (code: ContractPlanCode) => {
    setPlanCode(code);
    setTitle(code.toUpperCase());
  };

  const toggleRole = (id: string) => {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const refreshH = Number(refreshEveryHours);
    const boost = Number(boostCredits);
    if (!Number.isFinite(refreshH) || refreshH < 1) {
      setError('Rifreskimi duhet të jetë të paktën 1 orë.');
      return;
    }
    if (!Number.isFinite(boost) || boost < 0) {
      setError('Kreditet boost duhet të jenë numër ≥ 0.');
      return;
    }

    const readQuota = (raw: string, label: string): number | '__bad__' => {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        setError(`${label}: vendos numër të plotë ≥ 0.`);
        return '__bad__';
      }
      return n;
    };

    const qAll = readQuota(maxListAllCategories, 'Lista në të gjitha kategoritë');
    if (qAll === '__bad__') return;
    const qJobs = readQuota(maxJobListings, 'Vendet e punës');
    if (qJobs === '__bad__') return;
    const qCars = readQuota(maxCarListings, 'Makinat');
    if (qCars === '__bad__') return;
    const qApts = readQuota(maxApartmentListings, 'Apartamentet');
    if (qApts === '__bad__') return;
    const qProducts = readQuota(maxProductListings, 'Produktet');
    if (qProducts === '__bad__') return;
    const qPremium = readQuota(maxPremiumListings, 'Premium');
    if (qPremium === '__bad__') return;
    const qOkazion = readQuota(maxOkazionListings, 'OKAZION');
    if (qOkazion === '__bad__') return;

    const readOptionalPrice = (raw: string, labelSq: string): number | null | '__bad__' => {
      const s = String(raw).trim();
      if (s === '') return null;
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) {
        setError(`${labelSq}: vendos numër ≥ 0 ose lëre bosh.`);
        return '__bad__';
      }
      return n;
    };
    const p1 = readOptionalPrice(price1Month, 'Çmimi 1 muaj');
    if (p1 === '__bad__') return;
    const p3 = readOptionalPrice(price3Months, 'Çmimi 3 muaj');
    if (p3 === '__bad__') return;
    const p6 = readOptionalPrice(price6Months, 'Çmimi 6 muaj');
    if (p6 === '__bad__') return;
    const p12 = readOptionalPrice(price12Months, 'Çmimi 12 muaj');
    if (p12 === '__bad__') return;
    if (p1 === null && p3 === null && p6 === null && p12 === null) {
      setError('Vendosni të paktën një çmim. Fushat e tjera mund të mbeten bosh.');
      return;
    }

    if (!title.trim()) {
      setError('Titulli është i detyrueshëm.');
      return;
    }
    if (roleIds.length === 0) {
      setError('Zgjidhni të paktën një rol.');
      return;
    }

    const payload = {
      title: title.trim(),
      content,
      roleIds,
      listingCategoryKey: null as string | null,
      subscriberKind,
      planCode,
      sortOrder: PLAN_OPTIONS.findIndex((p) => p.value === planCode),
      refreshEveryHours: refreshH,
      glowBadgeEnabled,
      boostCredits: boost,
      dailyBoostAccess,
      maxListAllCategories: qAll,
      maxJobListings: qJobs,
      maxCarListings: qCars,
      maxApartmentListings: qApts,
      maxProductListings: qProducts,
      maxPremiumListings: qPremium,
      maxOkazionListings: qOkazion,
      price1Month: p1,
      price3Months: p3,
      price6Months: p6,
      price12Months: p12,
    };

    setPending(true);
    try {
      if (isEdit && props.contract) {
        const { error: err } = await updateContract(props.contract.id, payload);
        if (err) {
          setError(err);
          return;
        }
      } else {
        const { error: err } = await createContract(payload);
        if (err) {
          setError(err);
          return;
        }
      }
      await props.onSaved();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog
      open={open}
      onClose={props.onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            maxHeight: 'calc(100dvh - 24px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            mx: 1.5,
          },
        },
      }}
    >
      <Box
        component="form"
        onSubmit={(ev) => void submit(ev)}
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: '1 1 auto', overflow: 'hidden' }}
      >
        <Box
          sx={{
            position: 'relative',
            px: 3,
            pt: 2,
            pb: 1.5,
            pr: 6,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${alpha(infoMain, 0.12)} 0%, transparent 70%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 800, letterSpacing: '0.08em' }}>
            {isEdit ? 'Përditësim' : 'Plan i ri'}
          </Typography>
          <DialogTitle sx={{ p: 0, pt: 0.25, fontSize: '1.2rem', fontWeight: 800 }}>
            {isEdit ? `Ndrysho · ${props.contract?.title || 'plani'}` : 'Paketa kryesore'}
          </DialogTitle>
          <IconButton
            aria-label="Mbyll"
            onClick={props.onClose}
            size="small"
            sx={productDialogCloseButtonSx}
          >
            <XIcon size={18} weight="bold" />
          </IconButton>
        </Box>
        <DialogContent
          sx={{
            px: 3,
            pt: 2.5,
            pb: 2,
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          <Stack spacing={2.5}>
            {error ? (
              <Alert severity="error" sx={{ borderRadius: 1.5 }}>
                {error}
              </Alert>
            ) : null}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" sx={productFieldSx}>
                  <InputLabel id="plan-code-label">Kodi i planit</InputLabel>
                  <Select
                    labelId="plan-code-label"
                    label="Kodi i planit"
                    value={planCode}
                    onChange={(e) => setPlan(e.target.value as ContractPlanCode)}
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Titulli"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  required
                  fullWidth
                  size="small"
                  sx={productFieldSx}
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                Audienca
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={subscriberKind}
                onChange={(_, v) => v && setAudience(v)}
              >
                <ToggleButton value="agent" sx={{ ...productButtonSx, px: 1.5 }}>
                  Agjent (Individual)
                </ToggleButton>
                <ToggleButton value="company" sx={{ ...productButtonSx, px: 1.5 }}>
                  Kompani (Biznes)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25, fontWeight: 700 }}>
                Kuotat e postimeve
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Të gjitha kategoritë" value={maxListAllCategories} onChange={setMaxListAllCategories} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Vende pune" value={maxJobListings} onChange={setMaxJobListings} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Makina" value={maxCarListings} onChange={setMaxCarListings} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Apartamente" value={maxApartmentListings} onChange={setMaxApartmentListings} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Produkte" value={maxProductListings} onChange={setMaxProductListings} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="Premium" value={maxPremiumListings} onChange={setMaxPremiumListings} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <QuotaField label="OKAZION" value={maxOkazionListings} onChange={setMaxOkazionListings} />
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Rifreskim (orë)"
                  type="number"
                  value={refreshEveryHours}
                  onChange={(ev) => setRefreshEveryHours(ev.target.value)}
                  required
                  fullWidth
                  size="small"
                  helperText="Sa orë para se të rifreskojë të njëjtin njoftim."
                  slotProps={{
                    input: {
                      inputProps: { min: 1 },
                      endAdornment: <InputAdornment position="end">orë</InputAdornment>,
                    },
                  }}
                  sx={productFieldSx}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Boost Coins"
                  type="number"
                  value={boostCredits}
                  onChange={(ev) => setBoostCredits(ev.target.value)}
                  required
                  fullWidth
                  size="small"
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                  sx={productFieldSx}
                />
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={glowBadgeEnabled}
                    onChange={(ev) => setGlowBadgeEnabled(ev.target.checked)}
                    color="primary"
                  />
                }
                label="Badge Premium"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={dailyBoostAccess}
                    onChange={(ev) => setDailyBoostAccess(ev.target.checked)}
                    color="primary"
                  />
                }
                label="Boost ditor"
              />
            </Stack>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                Çmimet (€)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                FREE = 0. Plotësoni vetëm afatet që ofroni.
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="1 muaj"
                    type="number"
                    value={price1Month}
                    onChange={(ev) => setPrice1Month(ev.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        inputProps: { min: 0, step: '0.01' },
                        endAdornment: <InputAdornment position="end">€</InputAdornment>,
                      },
                    }}
                    sx={productFieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="3 muaj"
                    type="number"
                    value={price3Months}
                    onChange={(ev) => setPrice3Months(ev.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        inputProps: { min: 0, step: '0.01' },
                        endAdornment: <InputAdornment position="end">€</InputAdornment>,
                      },
                    }}
                    sx={productFieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="6 muaj"
                    type="number"
                    value={price6Months}
                    onChange={(ev) => setPrice6Months(ev.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        inputProps: { min: 0, step: '0.01' },
                        endAdornment: <InputAdornment position="end">€</InputAdornment>,
                      },
                    }}
                    sx={productFieldSx}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="12 muaj"
                    type="number"
                    value={price12Months}
                    onChange={(ev) => setPrice12Months(ev.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        inputProps: { min: 0, step: '0.01' },
                        endAdornment: <InputAdornment position="end">€</InputAdornment>,
                      },
                    }}
                    sx={productFieldSx}
                  />
                </Grid>
              </Grid>
            </Box>

            <TextField
              label="Shënime (opsionale)"
              value={content}
              onChange={(ev) => setContent(ev.target.value)}
              fullWidth
              multiline
              minRows={2}
              size="small"
              sx={productFieldSx}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                Rolet
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Zgjidhet automatikisht sipas audiencës (Individual / Biznes).
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                  maxHeight: 180,
                  overflow: 'auto',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                }}
              >
                <FormGroup sx={{ gap: 0.25 }}>
                  {props.roles.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nuk ka role në katalog.
                    </Typography>
                  ) : (
                    props.roles.map((r) => (
                      <FormControlLabel
                        key={r.id}
                        sx={{
                          mx: 0,
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        control={
                          <Checkbox
                            checked={roleIds.includes(r.id)}
                            onChange={() => toggleRole(r.id)}
                            color="primary"
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {r.name}
                          </Typography>
                        }
                      />
                    ))
                  )}
                </FormGroup>
              </Paper>
            </Box>
          </Stack>
        </DialogContent>
        <Divider sx={{ flexShrink: 0 }} />
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexShrink: 0 }}>
          <Button onClick={props.onClose} size="large" sx={productButtonSx}>
            Anulo
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={pending || roleIds.length === 0 || !title.trim()}
            sx={{ ...productButtonSx, minWidth: 140, px: 3 }}
          >
            {pending ? 'Duke u ruajtur…' : 'Ruaj'}
          </Button>
        </DialogActions>
      </Box>
    </ProductDialog>
  );
}
