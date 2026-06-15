'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  Card,
  CardContent,
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
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { useUser } from '@/hooks/use-user';
import { fetchAdminStats } from '@/lib/admin-stats-client';
import { listManagedUsers } from '@/lib/admin-users-client';
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
        title: 'Në pritje miratimi',
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
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Përmbledhje
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mirë se erdhe përsëri, {user?.firstName || user?.email}. KuTaGjej — administrimi i njoftimeve dhe
          përdoruesve.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {statCards.map((stat, i) => {
          const card = (
            <Card
              sx={
                stat.href
                  ? {
                      height: '100%',
                      transition: 'box-shadow 0.2s ease, transform 0.15s ease',
                      '&:hover': { boxShadow: 4 },
                    }
                  : { height: '100%' }
              }
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      bgcolor: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {React.createElement(stat.icon, { size: 28, weight: 'bold', color: 'white' })}
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              {stat.href ? (
                <Box
                  component={RouterLink}
                  href={stat.href}
                  sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
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
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Njoftime sipas kategorive
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Kategoria</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Aktive</TableCell>
                    <TableCell align="right">Në pritje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(byKind).map(([kind, row]) => (
                    <TableRow key={kind}>
                      <TableCell>{KIND_LABELS[kind] ?? kind}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                      <TableCell align="right">{row.approved}</TableCell>
                      <TableCell align="right">
                        {row.pending > 0 ? (
                          <Chip size="small" color="warning" label={row.pending} />
                        ) : (
                          row.pending
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Chip label="KuTaGjej Admin" color="primary" sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Paneli i administratorit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Njoftimet e reja shkojnë në radhën e moderimit. Aprovoni ose refuzoni nga{' '}
            <RouterLink href={paths.dashboard.listingModeration}>Njoftimet</RouterLink>.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
