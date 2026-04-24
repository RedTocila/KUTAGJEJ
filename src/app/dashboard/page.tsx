'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';

import { useUser } from '@/hooks/use-user';
import { listManagedUsers } from '@/lib/admin-users-client';
import { paths } from '@/paths';

type StatCard = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  /** When set, the whole stat card links here (e.g. directory of users). */
  href?: string;
};

export default function Page() {
  const { user } = useUser();

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  const [userCount, setUserCount] = React.useState<number | null>(null);
  /** For platform admin: false until first directory fetch finishes (show … while loading). */
  const [userDirFetched, setUserDirFetched] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id) return;
    if (!isPlatformAdmin) {
      setUserCount(null);
      setUserDirFetched(true);
      return;
    }
    let cancelled = false;
    setUserDirFetched(false);
    void (async () => {
      const { users, error } = await listManagedUsers();
      if (cancelled) return;
      setUserDirFetched(true);
      if (!error && users) {
        setUserCount(users.length);
      } else {
        setUserCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isPlatformAdmin]);

  const statCards: StatCard[] = React.useMemo(() => {
    const userValue = !isPlatformAdmin
      ? '—'
      : !userDirFetched
        ? '…'
        : userCount !== null
          ? String(userCount)
          : '—';
    return [
      { title: 'Njoftime aktive', value: '—', icon: MegaphoneIcon, color: 'primary.main' },
      {
        title: 'Përdorues',
        value: userValue,
        icon: UsersIcon,
        color: 'success.main',
        href: isPlatformAdmin ? paths.dashboard.staffUsers : undefined,
      },
      { title: 'Statusi i platformës', value: 'Online', icon: ShieldCheckIcon, color: 'info.main' },
    ];
  }, [isPlatformAdmin, userCount, userDirFetched]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Përmbledhje
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Mirë se erdhe përsëri, {user?.firstName || user?.email}. KuTaGjej — administrimi i
          njoftimeve dhe përdoruesve.
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

      <Card>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Chip label="KuTaGjej Admin" color="primary" sx={{ mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Paneli i administratorit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Këtu do të shfaqen shifrat e njoftimeve, raportet dhe veprime të shpejta për platformën e njoftimeve. Lidh
            API-të e listimeve kur të jenë gati.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
