'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';

import { ProgramDisplay } from '@/components/dashboard/referral/referral-program-display';
import { useUser } from '@/hooks/use-user';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import type { ReferralProgram } from '@/types/referral-program';
import type { MyReferralStats } from '@/types/referrals';
import { paths } from '@/paths';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function UserReferralView() {
  const router = useRouter();
  const { user } = useUser();
  const [stats, setStats] = React.useState<MyReferralStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copyMsg, setCopyMsg] = React.useState<string | null>(null);
  const [program, setProgram] = React.useState<ReferralProgram | undefined>(undefined);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyReferralStats();
    if (res.error) {
      setError(res.error);
      setStats(null);
    } else {
      setStats(res.referral ?? null);
      setProgram(res.program);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user) return;
    if (!canView) {
      router.replace(paths.user.dashboard);
      return;
    }
    void load();
  }, [user, canView, router, load]);

  if (!user || !canView) return null;

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyText(text);
    setCopyMsg(ok ? `${label} u kopjua.` : 'Kopjimi dështoi.');
    setTimeout(() => setCopyMsg(null), 2500);
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <HandshakeIcon size={28} weight="duotone" />
        <Stack spacing={0.25}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Referimi im
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fto miqtë të regjistrohen dhe fito Boost Credits sipas programit të platformës.
          </Typography>
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {copyMsg ? <Alert severity="success">{copyMsg}</Alert> : null}

      {loading ? (
        <Skeleton variant="rounded" height={220} />
      ) : stats ? (
        <>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
                      Kodi juaj
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '0.08em' }}>
                        {stats.code}
                      </Typography>
                      <IconButton size="small" aria-label="Kopjo kodin" onClick={() => void handleCopy(stats.code, 'Kodi')}>
                        <CopyIcon size={18} />
                      </IconButton>
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                    <Chip label={`${stats.referralCount} referime`} color="primary" sx={{ fontWeight: 700 }} />
                    <Chip label={`${stats.boostCredits} Boost Credits`} color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                  </Stack>
                </Stack>

                <TextField
                  fullWidth
                  label="Linku i ftesës"
                  value={stats.link}
                  slotProps={{
                    input: {
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton aria-label="Kopjo linkun" onClick={() => void handleCopy(stats.link, 'Linku')}>
                            <LinkSimpleIcon size={20} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  size="small"
                />

                {stats.nextTier ? (
                  <Alert severity="info" sx={{ alignItems: 'center' }}>
                    Edhe <strong>{stats.nextTier.remaining}</strong> referim
                    {stats.nextTier.remaining === 1 ? '' : 'e'} për nivelin «{stats.nextTier.title}» (+{stats.nextTier.boostCredits} BC).
                  </Alert>
                ) : (
                  <Alert severity="success">Keni arritur të gjitha nivelet aktuale të referimit falas.</Alert>
                )}

                {stats.referredBy ? (
                  <Typography variant="body2" color="text.secondary">
                    Ju u referuat nga: <strong>{stats.referredBy.displayName}</strong> ({stats.referredBy.email})
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Personat që keni referuar
            </Typography>
            {stats.referredUsers.length === 0 ? (
              <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Ende nuk keni referime. Ndani linkun e ftesës me miqtë tuaj.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Përdoruesi</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell align="right">BC të dhëna</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.referredUsers.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.referredUser?.displayName ?? '—'}</TableCell>
                        <TableCell>{row.referredUser?.email ?? '—'}</TableCell>
                        <TableCell>{formatDate(row.createdAt)}</TableCell>
                        <TableCell align="right">{row.creditsAwarded > 0 ? `+${row.creditsAwarded}` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </>
      ) : null}

      {program ? (
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Rregullat e programit
          </Typography>
          <ProgramDisplay program={program} />
        </Stack>
      ) : null}

      <Button variant="outlined" onClick={() => void load()} disabled={loading}>
        Rifresko
      </Button>
    </Stack>
  );
}
