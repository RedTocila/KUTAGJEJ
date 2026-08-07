'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Button,
  Card,
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
  Typography,
  useTheme,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Scroll as ScrollIcon } from '@phosphor-icons/react/dist/ssr/Scroll';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { Contract } from '@/types/contract';
import { getActiveContractPriceOptions } from '@/lib/contract-pricing';

export interface ContractsTableProps {
  contracts: Contract[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractsTable({ contracts, loading, onCreate, onEdit, onDelete }: ContractsTableProps) {
  const theme = useTheme();
  const infoMain = theme.palette.info.main;

  return (
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
              <TableCell>Lloji</TableCell>
              <TableCell>Kuotat</TableCell>
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
                      onClick={onCreate}
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
                        {row.planCode ? (
                          <Chip
                            size="small"
                            label={row.planCode.toUpperCase()}
                            sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        ) : null}
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
                  <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                    <Typography variant="body2">
                      {row.subscriberKind === 'company' ? 'Kompani' : row.subscriberKind === 'agent' ? 'Agjent' : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
                      All {row.maxListAllCategories} · Jobs {row.maxJobListings} · Cars {row.maxCarListings}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }} color="text.secondary">
                      Apt {row.maxApartmentListings} · Prod {row.maxProductListings} · Prem {row.maxPremiumListings}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                    <Typography variant="body2">
                      {row.refreshEveryHours != null ? `Pas ${row.refreshEveryHours} orësh` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 2, verticalAlign: 'top' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {row.boostCredits != null ? row.boostCredits : '—'}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {row.glowBadgeEnabled ? (
                        <Chip size="small" label="Premium" sx={{ height: 22, fontSize: '0.7rem' }} />
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
                      onClick={() => onEdit(row)}
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
                      onClick={() => onDelete(row)}
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
  );
}
