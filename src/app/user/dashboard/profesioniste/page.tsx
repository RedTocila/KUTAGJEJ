'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';

import { ProfessionalListingForm } from '@/components/professionals/professional-listing-form';
import { ProfessionalVerificationCard } from '@/components/professionals/professional-verification-card';
import { paths } from '@/paths';

export default function UserProfessionalsDashboardPage() {
  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Profesionistë
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Krijoni profilin publik, portofolin, orën e përgjigjes dhe kërkoni verifikimin.
        </Typography>
      </Stack>

      <ProfessionalVerificationCard />

      <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Posto profil
            </Typography>
            <Button component={Link} href={paths.user.realEstateListing} variant="text" size="small">
              Të gjitha kategoritë
            </Button>
          </Stack>
          <ProfessionalListingForm
            onSuccess={() => undefined}
            backHref={paths.user.dashboard}
            backLabel="Paneli"
          />
        </CardContent>
      </Card>
    </Stack>
  );
}
