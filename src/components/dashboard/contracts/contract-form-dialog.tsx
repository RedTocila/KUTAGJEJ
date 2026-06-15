'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';

import { paths } from '@/paths';
import type { Contract } from '@/types/contract';
import type { ListingCategory } from '@/types/listing-category';
import type { Role } from '@/types/role';
import { createContract, updateContract } from '@/lib/admin-contracts-client';

export function ContractFormDialog(props: {
  open?: boolean;
  contract?: Contract | null;
  onClose: () => void;
  roles: Role[];
  categories: ListingCategory[];
  onSaved: () => void | Promise<void>;
}) {
  const theme = useTheme();
  const isEdit = Boolean(props.contract);
  const open = isEdit ? Boolean(props.contract) : Boolean(props.open);
  const infoMain = theme.palette.info.main;

  const [createStep, setCreateStep] = React.useState(0);
  const [listingCategoryKey, setListingCategoryKey] = React.useState('');
  const [subscriberKind, setSubscriberKind] = React.useState<'agent' | 'company'>('agent');
  const [refreshEveryHours, setRefreshEveryHours] = React.useState('12');
  const [glowBadgeEnabled, setGlowBadgeEnabled] = React.useState(false);
  const [boostCredits, setBoostCredits] = React.useState('0');
  const [dailyBoostAccess, setDailyBoostAccess] = React.useState(false);
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
      setCreateStep(0);
      setListingCategoryKey(props.contract.listingCategoryKey ?? '');
      setSubscriberKind(props.contract.subscriberKind === 'company' ? 'company' : 'agent');
      setRefreshEveryHours(String(props.contract.refreshEveryHours ?? 12));
      setGlowBadgeEnabled(Boolean(props.contract.glowBadgeEnabled));
      setBoostCredits(String(props.contract.boostCredits ?? 0));
      setDailyBoostAccess(Boolean(props.contract.dailyBoostAccess));
      setPrice1Month(String(props.contract.price1Month ?? ''));
      setPrice3Months(String(props.contract.price3Months ?? ''));
      setPrice6Months(String(props.contract.price6Months ?? ''));
      setPrice12Months(String(props.contract.price12Months ?? ''));
      setTitle(props.contract.title);
      setContent(props.contract.content ?? '');
      setRoleIds(props.contract.roles.map((r) => r.id));
    } else {
      setCreateStep(0);
      setListingCategoryKey('');
      setSubscriberKind('agent');
      setRefreshEveryHours('12');
      setGlowBadgeEnabled(false);
      setBoostCredits('0');
      setDailyBoostAccess(false);
      setPrice1Month('');
      setPrice3Months('');
      setPrice6Months('');
      setPrice12Months('');
      setTitle('');
      setContent('');
      setRoleIds([]);
    }
    setError(null);
  }, [open, props.contract]);

  const toggleRole = (id: string) => {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const showPlanFields = isEdit || createStep === 1;
  const headerSubtitle = isEdit ? 'Përditësim' : createStep === 0 ? 'Hapi 1 · Kategoria' : 'Hapi 2 · Plani';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit && createStep === 0) {
      if (!listingCategoryKey) {
        setError('Zgjidhni një kategori kontrate.');
        return;
      }
      const cat = props.categories.find((c) => c.key === listingCategoryKey);
      const kindLabel = subscriberKind === 'agent' ? 'Agjent' : 'Kompani';
      if (cat) setTitle(`${cat.title} · ${kindLabel}`);
      setCreateStep(1);
      return;
    }

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
    if (!listingCategoryKey) {
      setError('Mungon kategoria.');
      return;
    }

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

    setPending(true);
    try {
      if (isEdit && props.contract) {
        const { error: err } = await updateContract(props.contract.id, {
          title: title.trim(),
          content,
          roleIds,
          listingCategoryKey,
          subscriberKind,
          refreshEveryHours: refreshH,
          glowBadgeEnabled,
          boostCredits: boost,
          dailyBoostAccess,
          price1Month: p1,
          price3Months: p3,
          price6Months: p6,
          price12Months: p12,
        });
        if (err) {
          setError(err);
          return;
        }
      } else {
        const { error: err } = await createContract({
          title: title.trim(),
          content,
          roleIds,
          listingCategoryKey,
          subscriberKind,
          refreshEveryHours: refreshH,
          glowBadgeEnabled,
          boostCredits: boost,
          dailyBoostAccess,
          price1Month: p1,
          price3Months: p3,
          price6Months: p6,
          price12Months: p12,
        });
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
    <Dialog
      open={open}
      onClose={props.onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            maxHeight: 'calc(100dvh - 24px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
            px: 3,
            pt: 2,
            pb: 1.5,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${alpha(infoMain, 0.12)} 0%, transparent 70%)`,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 800, letterSpacing: '0.08em' }}>
            {headerSubtitle}
          </Typography>
          <DialogTitle sx={{ p: 0, pt: 0.25, fontSize: '1.2rem', fontWeight: 800 }}>
            {isEdit ? 'Kontrata' : createStep === 0 ? 'Zgjidh kategorinë' : 'Detajet e planit'}
          </DialogTitle>
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

            {!showPlanFields ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Së pari zgjidh vertikalin (p.sh. Real Estate). Hapi tjetër: agjent vs kompani, rifreskim, boost.
                </Typography>
                {props.categories.length === 0 ? (
                  <Alert severity="warning">
                    Nuk ka kategori.{' '}
                    <Box
                      component={RouterLink}
                      href={paths.dashboard.kategorite}
                      sx={{ fontWeight: 700, color: 'inherit' }}
                    >
                      Kategoritë
                    </Box>
                  </Alert>
                ) : (
                  <RadioGroup
                    value={listingCategoryKey}
                    onChange={(ev) => setListingCategoryKey(ev.target.value)}
                  >
                    <Stack spacing={1}>
                      {props.categories.map((c) => (
                        <Paper
                          key={c.key}
                          variant="outlined"
                          sx={{
                            px: 2,
                            py: 1.25,
                            borderRadius: 1.5,
                            borderColor: listingCategoryKey === c.key ? 'primary.main' : 'divider',
                            bgcolor: listingCategoryKey === c.key ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                          }}
                        >
                          <FormControlLabel
                            value={c.key}
                            control={<Radio size="small" />}
                            label={<Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>}
                            sx={{ m: 0 }}
                          />
                        </Paper>
                      ))}
                    </Stack>
                  </RadioGroup>
                )}
              </Box>
            ) : (
              <>
                {isEdit ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                      Kategoria
                    </Typography>
                    <RadioGroup
                      row
                      value={listingCategoryKey}
                      onChange={(ev) => setListingCategoryKey(ev.target.value)}
                      sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    >
                      {props.categories.map((c) => (
                        <FormControlLabel
                          key={c.key}
                          value={c.key}
                          control={<Radio size="small" />}
                          label={c.title}
                        />
                      ))}
                    </RadioGroup>
                  </Box>
                ) : null}

                {!isEdit ? (
                  <Button
                    type="button"
                    size="small"
                    onClick={() => setCreateStep(0)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    ← Ndrysho kategorinë
                  </Button>
                ) : null}

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                    Lloji i abonentit
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={subscriberKind}
                    onChange={(_, v) => v && setSubscriberKind(v)}
                  >
                    <ToggleButton value="agent">Agjent</ToggleButton>
                    <ToggleButton value="company">Kompani</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <TextField
                  label="Rifreskimi çdo sa orë"
                  type="number"
                  value={refreshEveryHours}
                  onChange={(ev) => setRefreshEveryHours(ev.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      inputProps: { min: 1 },
                      endAdornment: <InputAdornment position="end">orë</InputAdornment>,
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={glowBadgeEnabled}
                      onChange={(ev) => setGlowBadgeEnabled(ev.target.checked)}
                      color="primary"
                    />
                  }
                  label="Glow + badge"
                />

                <TextField
                  label="Kreditet boost"
                  type="number"
                  value={boostCredits}
                  onChange={(ev) => setBoostCredits(ev.target.value)}
                  required
                  fullWidth
                  slotProps={{ input: { inputProps: { min: 0 } } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={dailyBoostAccess}
                      onChange={(ev) => setDailyBoostAccess(ev.target.checked)}
                      color="primary"
                    />
                  }
                  label="Qasje në boost ditor"
                />

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                    Çmimet e abonimit (€)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Plotësoni vetëm afatet që ofroni (p.sh. vetëm mujore, ose mujore + vjetore). Të paktën një çmim.
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
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
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
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <TextField
                  label="Titulli"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  required
                  fullWidth
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
                <TextField
                  label="Shënime"
                  value={content}
                  onChange={(ev) => setContent(ev.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="Opsionale"
                  size="small"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Rolet
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 1.5,
                      border: '1px dashed',
                      borderColor: 'divider',
                      maxHeight: 220,
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
                            label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>}
                          />
                        ))
                      )}
                    </FormGroup>
                  </Paper>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <Divider sx={{ flexShrink: 0 }} />
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexShrink: 0 }}>
          <Button onClick={props.onClose} size="large" sx={{ borderRadius: 2 }}>
            Anulo
          </Button>
          {!isEdit && createStep === 0 ? (
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={pending || !listingCategoryKey || props.categories.length === 0}
              sx={{ minWidth: 140, borderRadius: 2, px: 3 }}
            >
              Vazhdu
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={pending || roleIds.length === 0 || !title.trim()}
              sx={{ minWidth: 140, borderRadius: 2, px: 3 }}
            >
              {pending ? 'Duke u ruajtur…' : 'Ruaj'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
