'use client';

import * as React from 'react';
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { useUser } from '@/hooks/use-user';

type StatCard = {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
};

export default function Page() {
  const { user } = useUser();

  const statCards: StatCard[] = [
    { title: 'Njoftime aktive', value: '—', icon: MegaphoneIcon, color: 'primary.main' },
    { title: 'Përdorues', value: '—', icon: UsersIcon, color: 'success.main' },
    { title: 'Statusi i platformës', value: 'Online', icon: ShieldCheckIcon, color: 'info.main' },
  ];

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
        {statCards.map((stat, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card>
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
            </Grid>
        ))}
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
