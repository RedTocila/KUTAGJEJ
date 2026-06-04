'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { BusinessOwnerReservations } from '@/components/businesses/business-owner-reservations';
import { BusinessListingForm } from '@/components/businesses/business-listing-form';
import { paths } from '@/paths';

type Tab = 'post' | 'reservations';

export default function UserBusinessesDashboardPage() {
  const [tab, setTab] = React.useState<Tab>('post');

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Biznese
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Menaxhoni profilin e lokalit, menunë, orarin dhe rezervimet.
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button variant={tab === 'post' ? 'contained' : 'outlined'} onClick={() => setTab('post')}>
          Posto / përditëso
        </Button>
        <Button variant={tab === 'reservations' ? 'contained' : 'outlined'} onClick={() => setTab('reservations')}>
          Rezervimet
        </Button>
        <Button component={Link} href={paths.user.realEstateListing} variant="text" startIcon={<PlusIcon size={18} />}>
          Të gjitha kategoritë
        </Button>
      </Stack>

      {tab === 'post' ? (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <BusinessListingForm
              onSuccess={() => setTab('reservations')}
              backHref={paths.user.dashboard}
              backLabel="Paneli"
            />
          </CardContent>
        </Card>
      ) : (
        <BusinessOwnerReservations />
      )}
    </Stack>
  );
}
