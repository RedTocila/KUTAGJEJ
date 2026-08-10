'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import {
  fetchAdminReferralOverview,
  fetchAdminReferralSignups,
  fetchAdminReferralUsers,
} from '@/lib/referrals-client';
import type { AdminReferralOverview, AdminReferralSignupRow, AdminReferralUserRow } from '@/types/referrals';
import { productPanelSx } from '@/styles/product-sx';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Box sx={{ ...productPanelSx, p: 2.5, height: '100%' }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ReferralTrackingAdminPage() {
  const { isPlatformAdmin } = usePlatformAdminGuard();
  const [tab, setTab] = React.useState(0);
  const [overview, setOverview] = React.useState<AdminReferralOverview | null>(null);
  const [signups, setSignups] = React.useState<AdminReferralSignupRow[]>([]);
  const [users, setUsers] = React.useState<AdminReferralUserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const userFilter: 'all' | 'referrers' | 'referred' =
    tab === 1 ? 'referrers' : tab === 2 ? 'referred' : 'all';

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const [ov, su, us] = await Promise.all([
      fetchAdminReferralOverview(),
      fetchAdminReferralSignups(1, 50),
      fetchAdminReferralUsers(1, 50, userFilter),
    ]);
    if (ov.error || su.error || us.error) {
      setError(ov.error ?? su.error ?? us.error ?? 'Gabim.');
    } else {
      setOverview(ov.overview ?? null);
      setSignups(su.signups ?? []);
      setUsers(us.users ?? []);
    }
    setLoading(false);
  }, [userFilter]);

  React.useEffect(() => {
    if (!isPlatformAdmin) return;
    void load();
  }, [isPlatformAdmin, load]);

  if (!isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(HandshakeIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Rritja"
        title="Gjurmimi i referimeve"
        description="Shiko kush ka referuar, kush u referua dhe sa Boost Credits u dhanë."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? (
        <Skeleton variant="rounded" height={120} />
      ) : overview ? (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Referime totale" value={overview.totalSignups} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Referues unikë" value={overview.uniqueReferrers} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="Përdorues të referuar" value={overview.usersReferred} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard label="BC të dhëna" value={overview.totalCreditsAwarded} />
          </Grid>
        </Grid>
      ) : null}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)}>
          <Tab label="Historiku i referimeve" />
          <Tab label="Referuesit" />
          <Tab label="Të referuarit" />
        </Tabs>
      </Box>

      {loading ? (
        <Skeleton variant="rounded" height={320} />
      ) : tab === 0 ? (
        <Box sx={{ ...productPanelSx, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Referuesi</TableCell>
                <TableCell>Email referuesi</TableCell>
                <TableCell>I referuari</TableCell>
                <TableCell>Email i referuarit</TableCell>
                <TableCell>Kodi</TableCell>
                <TableCell align="right">BC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {signups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nuk ka referime ende.
                  </TableCell>
                </TableRow>
              ) : (
                signups.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.referrer?.displayName ?? '—'}</TableCell>
                    <TableCell>{row.referrer?.email ?? '—'}</TableCell>
                    <TableCell>{row.referredUser?.displayName ?? '—'}</TableCell>
                    <TableCell>{row.referredUser?.email ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.referralCodeUsed || '—'} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="right">{row.creditsAwarded > 0 ? `+${row.creditsAwarded}` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      ) : (
        <Box sx={{ ...productPanelSx, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Përdoruesi</TableCell>
                <TableCell>Lloji</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Kodi</TableCell>
                <TableCell>Referuar nga</TableCell>
                <TableCell align="right">Referime</TableCell>
                <TableCell align="right">BC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nuk ka përdorues për këtë filtër.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.displayName}</TableCell>
                    <TableCell>{row.accountKind === 'business' ? 'Biznes' : 'Individ'}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.referralCode ?? '—'}</TableCell>
                    <TableCell>{row.referredBy?.displayName ?? '—'}</TableCell>
                    <TableCell align="right">{row.referralCount}</TableCell>
                    <TableCell align="right">{row.boostCredits}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}
