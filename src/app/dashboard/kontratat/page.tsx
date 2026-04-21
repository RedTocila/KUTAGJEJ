'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  ToggleButton,
  ToggleButtonGroup,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Scroll as ScrollIcon } from '@phosphor-icons/react/dist/ssr/Scroll';
import { Shield as ShieldIcon } from '@phosphor-icons/react/dist/ssr/Shield';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { paths } from '@/paths';
import type { Contract } from '@/types/contract';
import type { ListingCategory } from '@/types/listing-category';
import type { Role } from '@/types/role';
import {
  createContract,
  deleteContract,
  listContracts,
  updateContract,
} from '@/lib/admin-contracts-client';
import { listCategoriesAdmin } from '@/lib/admin-categories-client';
import { listRoles } from '@/lib/admin-roles-client';
import { useUser } from '@/hooks/use-user';
import { getActiveContractPriceOptions } from '@/lib/contract-pricing';

export default function KontratatPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useUser();

  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editContract, setEditContract] = React.useState<Contract | null>(null);
  const [deleteContractState, setDeleteContractState] = React.useState<Contract | null>(null);

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const refresh = React.useCallback(async () => {
    setLoadError(null);
    const [contractsRes, rolesRes, categoriesRes] = await Promise.all([
      listContracts(),
      listRoles(),
      listCategoriesAdmin(),
    ]);
    if (contractsRes.error) {
      setLoadError(contractsRes.error);
      setContracts([]);
    } else {
      setContracts(contractsRes.contracts ?? []);
    }
    if (!rolesRes.error) {
      setRoles(rolesRes.roles ?? []);
    }
    if (!categoriesRes.error) {
      setCategories(categoriesRes.categories ?? []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    if (!isPlatformAdmin) {
      router.replace(paths.dashboard.overview);
      return;
    }
    void refresh();
  }, [user, router, refresh, isPlatformAdmin]);

  if (!user) return null;
  if (!isPlatformAdmin) return null;

  const infoMain = theme.palette.info.main;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Hero */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          background: (t) =>
            `linear-gradient(135deg, ${alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.14 : 0.1)} 0%, ${alpha(t.palette.info.main, t.palette.mode === 'dark' ? 0.04 : 0.02)} 55%, transparent 100%)`,
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2.5, sm: 3 },
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2.5,
            alignItems: { xs: 'stretch', md: 'flex-start' },
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: `linear-gradient(145deg, ${infoMain} 0%, ${alpha(infoMain, 0.75)} 100%)`,
                color: theme.palette.info.contrastText,
                boxShadow: `0 8px 24px ${alpha(infoMain, 0.35)}`,
              }}
            >
              {React.createElement(ScrollIcon, { size: 30, weight: 'duotone' })}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                Kontratat
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
                Plane për kategori (p.sh. real estate) — agjent ose kompani, rifreskim, boost, glow.
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1.5,
              alignItems: { xs: 'stretch', sm: 'center' },
              flexShrink: 0,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 1.5,
                bgcolor: alpha(infoMain, 0.08),
                border: '1px solid',
                borderColor: alpha(infoMain, 0.2),
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Në listë
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'info.main', lineHeight: 1 }}>
                {loading ? '—' : contracts.length}
              </Typography>
            </Paper>
            <Button
              variant="contained"
              size="large"
              startIcon={React.createElement(PlusIcon, { size: 20 })}
              onClick={() => setCreateOpen(true)}
              sx={{
                px: 2.5,
                borderRadius: 2,
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.35)}`,
              }}
            >
              Shto kontratë
            </Button>
          </Box>
        </Box>
      </Paper>

      {roles.length === 0 && !loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: alpha(infoMain, 0.15),
              color: 'info.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {React.createElement(ShieldIcon, { size: 22, weight: 'duotone' })}
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Së pari krijoni role
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Nuk ka ende role në katalog.{' '}
              <Box
                component={RouterLink}
                href={paths.dashboard.roles}
                sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                Kaloni te Rolet
              </Box>{' '}
              përpara se të lidhni kontrata me përdorues.
            </Typography>
          </Box>
        </Paper>
      ) : null}

      {loadError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: theme.palette.mode === 'dark' ? 'none' : `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Lista e kontratave
          </Typography>
          {!loading ? (
            <Chip
              size="small"
              label={`${contracts.length} ${contracts.length === 1 ? 'kontratë' : 'kontrata'}`}
              sx={{ fontWeight: 700, bgcolor: alpha(infoMain, 0.12), color: 'info.dark' }}
            />
          ) : null}
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                    borderBottom: '2px solid',
                    borderColor: 'divider',
                    py: 1.75,
                  },
                }}
              >
                <TableCell>Kontrata</TableCell>
                <TableCell>Kategoria</TableCell>
                <TableCell>Lloji</TableCell>
                <TableCell>Rifreskimi</TableCell>
                <TableCell>Boost</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Çmimet</TableCell>
                <TableCell>Rolet</TableCell>
                <TableCell align="right" width={120}>
                  Veprime
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} sx={{ py: 2 }}>
                        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ border: 'none' }}>
                    <Box
                      sx={{
                        py: 6,
                        px: 2,
                        textAlign: 'center',
                        maxWidth: 420,
                        mx: 'auto',
                      }}
                    >
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          mx: 'auto',
                          mb: 2,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(infoMain, 0.1),
                          color: 'info.main',
                        }}
                      >
                        {React.createElement(ScrollIcon, { size: 36, weight: 'duotone' })}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Nuk ka ende kontrata
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2.5 }}>
                        Krijoni kontratën e parë dhe zgjidhni cilët role nga katalogu e lidhin me të.
                      </Typography>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={React.createElement(PlusIcon, { size: 20 })}
                        onClick={() => setCreateOpen(true)}
                      >
                        Shto kontratë
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((row, idx) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{
                      '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.primary.main, 0.015) },
                      '&:hover': { bgcolor: alpha(infoMain, 0.04) },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell sx={{ py: 2, maxWidth: { xs: 160, md: 220 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'text.disabled',
                            mt: 0.25,
                            minWidth: 22,
                          }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </Typography>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                            {row.title}
                          </Typography>
                          {row.content ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                mt: 0.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {row.content}
                            </Typography>
                          ) : null}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.listingCategoryTitle ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      <Typography variant="body2">
                        {row.subscriberKind === 'company' ? 'Kompani' : row.subscriberKind === 'agent' ? 'Agjent' : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      <Typography variant="body2">
                        {row.refreshEveryHours != null ? `Çdo ${row.refreshEveryHours} orë` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.boostCredits != null ? row.boostCredits : '—'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {row.glowBadgeEnabled ? (
                          <Chip size="small" label="Glow" sx={{ height: 22, fontSize: '0.7rem' }} />
                        ) : null}
                        {row.dailyBoostAccess ? (
                          <Chip size="small" label="Ditore" sx={{ height: 22, fontSize: '0.7rem' }} />
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      {getActiveContractPriceOptions(row).length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          Pa çmime
                        </Typography>
                      ) : (
                        <Stack spacing={0.35}>
                          {getActiveContractPriceOptions(row).map((opt) => (
                            <Typography key={opt.months} variant="caption" sx={{ lineHeight: 1.35 }}>
                              {opt.labelSq}:{' '}
                              <Box component="span" sx={{ fontWeight: 700 }}>
                                {opt.price} €
                              </Box>
                            </Typography>
                          ))}
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {row.roles.map((r) => (
                          <Chip
                            key={r.id}
                            size="small"
                            label={r.name}
                            sx={{
                              fontWeight: 600,
                              border: 'none',
                              bgcolor: alpha(infoMain, 0.12),
                              color: theme.palette.mode === 'dark' ? 'info.light' : 'info.dark',
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2, verticalAlign: 'middle' }}>
                      <IconButton
                        aria-label="Ndrysho"
                        size="small"
                        onClick={() => setEditContract(row)}
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                        }}
                      >
                        {React.createElement(PencilSimpleIcon, { size: 20 })}
                      </IconButton>
                      <IconButton
                        aria-label="Fshi"
                        size="small"
                        color="error"
                        onClick={() => setDeleteContractState(row)}
                        sx={{ ml: 0.5 }}
                      >
                        {React.createElement(TrashIcon, { size: 20 })}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ContractFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
        categories={categories}
        onSaved={async () => {
          setCreateOpen(false);
          await refresh();
        }}
      />

      <ContractFormDialog
        contract={editContract}
        onClose={() => setEditContract(null)}
        roles={roles}
        categories={categories}
        onSaved={async () => {
          setEditContract(null);
          await refresh();
        }}
      />

      <ContractDeleteDialog
        contract={deleteContractState}
        onClose={() => setDeleteContractState(null)}
        onDeleted={async () => {
          setDeleteContractState(null);
          await refresh();
        }}
      />
    </Box>
  );
}

function ContractFormDialog(props: {
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

function ContractDeleteDialog(props: {
  contract: Contract | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const theme = useTheme();
  const { contract, onClose, onDeleted } = props;
  const open = Boolean(contract);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const confirm = async () => {
    if (!contract) return;
    setError(null);
    setPending(true);
    try {
      const { error: err } = await deleteContract(contract.id);
      if (err) {
        setError(err);
        return;
      }
      await onDeleted();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          elevation: 0,
          sx: { borderRadius: 2, border: '1px solid', borderColor: 'divider' },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Fshi kontratën?</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 1.5, borderRadius: 1.5 }}>
            {error}
          </Alert>
        ) : null}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.error.main, 0.06),
            border: '1px solid',
            borderColor: alpha(theme.palette.error.main, 0.2),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Kontrata{' '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {contract?.title}
            </Box>{' '}
            do të hiqet përgjithmonë. Ky veprim nuk kthehet mbrapsht.
          </Typography>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} size="large" sx={{ borderRadius: 2 }}>
          Anulo
        </Button>
        <Button
          color="error"
          variant="contained"
          size="large"
          onClick={() => void confirm()}
          disabled={pending}
          sx={{ borderRadius: 2, minWidth: 100 }}
        >
          {pending ? 'Duke u fshirë…' : 'Fshi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
