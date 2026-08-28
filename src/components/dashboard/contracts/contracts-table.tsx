'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { Contract, ContractPlanCode, ContractSubscriberKind } from '@/types/contract';
import { getActiveContractPriceOptions } from '@/lib/contract-pricing';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';
import { MOTION } from '@/styles/motion';

const PLAN_ORDER: ContractPlanCode[] = ['free', 'starter', 'grow', 'elite'];

export interface ContractsTableProps {
  contracts: Contract[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

function sortPlatformContracts(list: Contract[]): Contract[] {
  return [...list].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf((a.planCode || 'free') as ContractPlanCode);
    const bi = PLAN_ORDER.indexOf((b.planCode || 'free') as ContractPlanCode);
    if (ai !== bi) return ai - bi;
    const ak = a.subscriberKind === 'company' ? 1 : 0;
    const bk = b.subscriberKind === 'company' ? 1 : 0;
    return ak - bk;
  });
}

export function ContractsTable({ contracts, loading, onCreate, onEdit, onDelete }: ContractsTableProps) {
  const theme = useTheme();
  const infoMain = theme.palette.info.main;
  const [audience, setAudience] = React.useState<'all' | ContractSubscriberKind>('all');

  const filtered = React.useMemo(() => {
    const base = sortPlatformContracts(contracts);
    if (audience === 'all') return base;
    return base.filter((c) => c.subscriberKind === audience);
  }, [contracts, audience]);

  return (
    <Box sx={{ ...productPanelSx }}>
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
          gap: 1.5,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'action.hover'),
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            FREE · STARTER · GROW · ELITE
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Planet e abonimit që shfaqen te dyqani (agjent / kompani).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={audience}
            onChange={(_, v) => v && setAudience(v)}
          >
            <ToggleButton value="all" sx={{ ...productButtonSx, px: 1.25, textTransform: 'none' }}>
              Të gjitha
            </ToggleButton>
            <ToggleButton value="agent" sx={{ ...productButtonSx, px: 1.25, textTransform: 'none' }}>
              Agjent
            </ToggleButton>
            <ToggleButton value="company" sx={{ ...productButtonSx, px: 1.25, textTransform: 'none' }}>
              Kompani
            </ToggleButton>
          </ToggleButtonGroup>
          {!loading ? (
            <Chip
              size="small"
              label={`${filtered.length} ${filtered.length === 1 ? 'paketë' : 'paketa'}`}
              sx={{ fontWeight: 700 }}
            />
          ) : null}
        </Stack>
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
              <TableCell>Plani</TableCell>
              <TableCell>Audienca</TableCell>
              <TableCell>Kuotat</TableCell>
              <TableCell>Rifreskimi</TableCell>
              <TableCell>Boost</TableCell>
              <TableCell sx={{ minWidth: 100 }}>Çmimi</TableCell>
              <TableCell align="right" width={120}>
                Veprime
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} sx={{ py: 2 }}>
                      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ border: 'none' }}>
                  <Box sx={{ py: 6, px: 2, textAlign: 'center', maxWidth: 420, mx: 'auto' }}>
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
                      {React.createElement(PackageIcon, { size: 36, weight: 'duotone' })}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Nuk ka paketa kryesore
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2.5 }}>
                      Planet FREE / STARTER / GROW / ELITE synohen të krijohen automatikisht. Mund të
                      shtoni një plan manualisht nëse mungon.
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={React.createElement(PlusIcon, { size: 20 })}
                      onClick={onCreate}
                      sx={productButtonSx}
                    >
                      Shto plan
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    '&:hover': { bgcolor: alpha(infoMain, 0.04) },
                    transition: `background-color ${MOTION.fast} ${MOTION.ease}`,
                  }}
                >
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                      {row.title}
                    </Typography>
                    {row.planCode ? (
                      <Chip
                        size="small"
                        label={row.planCode.toUpperCase()}
                        sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Chip
                      size="small"
                      label={
                        row.subscriberKind === 'company'
                          ? 'Kompani'
                          : row.subscriberKind === 'agent'
                            ? 'Agjent'
                            : '—'
                      }
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }}>
                      All {row.maxListAllCategories} · Jobs {row.maxJobListings} · Cars{' '}
                      {row.maxCarListings}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }} color="text.secondary">
                      Apt {row.maxApartmentListings} · Prod {row.maxProductListings} · Prem{' '}
                      {row.maxPremiumListings} · OKZ {row.maxOkazionListings}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2">
                      {row.refreshEveryHours != null ? `${row.refreshEveryHours}h` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {row.boostCredits != null ? row.boostCredits : '—'} BC
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2 }}>
                    {getActiveContractPriceOptions(row).length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Pa çmime
                      </Typography>
                    ) : (
                      <Stack spacing={0.25}>
                        {getActiveContractPriceOptions(row).map((opt) => (
                          <Typography key={opt.months} variant="caption" sx={{ lineHeight: 1.35 }}>
                            {opt.labelSq}:{' '}
                            <Box component="span" sx={{ fontWeight: 800 }}>
                              {opt.price} €
                            </Box>
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 2 }}>
                    <IconButton
                      aria-label="Ndrysho"
                      size="small"
                      onClick={() => onEdit(row)}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                      }}
                    >
                      {React.createElement(PencilSimpleIcon, { size: 18 })}
                    </IconButton>
                    <IconButton
                      aria-label="Fshi"
                      size="small"
                      color="error"
                      onClick={() => onDelete(row)}
                      sx={{ ml: 0.5 }}
                    >
                      {React.createElement(TrashIcon, { size: 18 })}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
