'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { ChartPie as ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import { useUser } from '@/hooks/use-user';
import { fetchAdminStats } from '@/lib/admin-stats-client';
import { listManagedUsers } from '@/lib/admin-users-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { paths } from '@/paths';

type StatCard = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  href?: string;
};

const KIND_LABELS: Record<string, string> = {
  'real-estate': 'Prona',
  cars: 'Makina',
  jobs: 'Punë',
  marketplace: 'Tregu',
  businesses: 'Biznese',
  professionals: 'Profesionistë',
};

export default function Page() {
  const { user } = useUser();

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const [userCount, setUserCount] = React.useState<number | null>(null);
  const [userDirFetched, setUserDirFetched] = React.useState(false);
  const [statsFetched, setStatsFetched] = React.useState(false);
  const [activeListings, setActiveListings] = React.useState<number | null>(null);
  const [pendingListings, setPendingListings] = React.useState<number | null>(null);
  const [totalListings, setTotalListings] = React.useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = React.useState<number | null>(null);
  const [byKind, setByKind] = React.useState<Record<string, { total: number; pending: number; approved: number }>>({});

  React.useEffect(() => {
    if (!user?.id) return;
    if (!isPlatformAdmin) {
      setUserCount(null);
      setUserDirFetched(true);
      setStatsFetched(true);
      return;
    }
    let cancelled = false;
    setUserDirFetched(false);
    setStatsFetched(false);
    void (async () => {
      const [usersRes, statsRes] = await Promise.all([listManagedUsers(), fetchAdminStats()]);
      if (cancelled) return;
      setUserDirFetched(true);
      setStatsFetched(true);
      if (!usersRes.error && usersRes.users) setUserCount(usersRes.users.length);
      else setUserCount(null);
      if (!statsRes.error && statsRes.stats) {
        setActiveListings(statsRes.stats.listings.totals.approved);
        setPendingListings(statsRes.stats.listings.totals.pending);
        setTotalListings(statsRes.stats.listings.totals.total);
        setUnreadNotifications(statsRes.stats.notifications.unread);
        setByKind(statsRes.stats.listings.byKind);
      } else {
        setActiveListings(null);
        setPendingListings(null);
        setTotalListings(null);
        setUnreadNotifications(null);
        setByKind({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isPlatformAdmin]);

  const loadingVal = (n: number | null) => (!isPlatformAdmin ? '—' : !statsFetched ? '…' : n !== null ? String(n) : '—');

  const statCards: StatCard[] = React.useMemo(() => {
    const userValue = !isPlatformAdmin
      ? '—'
      : !userDirFetched
        ? '…'
        : userCount !== null
          ? String(userCount)
          : '—';
    return [
      {
        title: 'Njoftime aktive',
        value: loadingVal(activeListings),
        icon: MegaphoneIcon,
        color: 'primary.main',
      },
      {
        title: 'Hequr / në shqyrtim',
        value: loadingVal(pendingListings),
        icon: ClockIcon,
        color: 'warning.main',
        href: isPlatformAdmin ? paths.dashboard.listingModeration : undefined,
      },
      {
        title: 'Njoftime totale',
        value: loadingVal(totalListings),
        icon: MegaphoneIcon,
        color: 'secondary.main',
      },
      {
        title: 'Njoftime të palexuara',
        value: loadingVal(unreadNotifications),
        icon: BellIcon,
        color: 'error.main',
        href: isPlatformAdmin ? paths.dashboard.listingModeration : undefined,
      },
      {
        title: 'Përdorues (staff)',
        value: userValue,
        icon: UsersIcon,
        color: 'success.main',
        href: isPlatformAdmin ? paths.dashboard.staffUsers : undefined,
      },
      { title: 'Statusi i platformës', value: 'Online', icon: ShieldCheckIcon, color: 'info.main' },
    ];
  }, [
    isPlatformAdmin,
    userCount,
    userDirFetched,
    statsFetched,
    activeListings,
    pendingListings,
    totalListings,
    unreadNotifications,
  ]);

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(ChartPieIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Paneli"
        title="Përmbledhje"
        description={`Mirë se erdhe, ${user?.firstName || user?.email}. Shiko statusin e njoftimeve, moderimin dhe stafin.`}
      />

      <Grid container spacing={2}>
        {statCards.map((stat, i) => {
          const card = (
            <Box
              sx={{
                height: '100%',
                p: 2.25,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                ...(stat.href
                  ? {
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: (t) => `0 8px 24px ${primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.1)}`,
                      },
                    }
                  : null),
              }}
            >
              <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: stat.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {React.createElement(stat.icon, { size: 22, weight: 'bold', color: 'white' })}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.25 }}>
                    {stat.title}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              {stat.href ? (
                <Box
                  component={RouterLink}
                  href={stat.href}
                  sx={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
                >
                  {card}
                </Box>
              ) : (
                card
              )}
            </Grid>
          );
        })}
      </Grid>

      {isPlatformAdmin && statsFetched && Object.keys(byKind).length > 0 ? (
        <Box
          sx={{
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Njoftime sipas kategorive
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Kategoria</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Aktive
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Në pritje
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(byKind).map(([kind, row]) => (
                <TableRow key={kind} hover>
                  <TableCell>{KIND_LABELS[kind] ?? kind}</TableCell>
                  <TableCell align="right">{row.total}</TableCell>
                  <TableCell align="right">{row.approved}</TableCell>
                  <TableCell align="right">
                    {row.pending > 0 ? <Chip size="small" color="warning" label={row.pending} /> : row.pending}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : null}

      {isPlatformAdmin ? (
        <Box
          sx={{
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: primaryMainAlpha(0.06),
            px: 2.5,
            py: 2.25,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Radha e moderimit
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Njoftimet e reja shkojnë në radhë para publikimit.{' '}
            <Box component={RouterLink} href={paths.dashboard.listingModeration} sx={{ color: 'primary.main', fontWeight: 700 }}>
              Hap njoftimet
            </Box>
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
