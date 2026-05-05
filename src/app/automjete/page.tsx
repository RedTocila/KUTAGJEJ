import * as React from 'react';
import type { Metadata } from 'next';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { config } from '@/config';
import { fetchLatestCars } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Automjete — Makina, motora dhe mjete pune për shitje',
  description:
    'Eksploro shitjet e automjeteve në Shqipëri — makina, motora, mjete pune dhe pjesë këmbimi. Foto, çmime dhe specifika në KuTaGjej.',
  alternates: { canonical: paths.public.cars },
  openGraph: {
    title: `Automjete | ${config.site.name}`,
    description: 'Makina për shitje, motora dhe mjete pune — të gjitha në KuTaGjej.',
    url: `${config.site.url}${paths.public.cars}`,
    type: 'website',
  },
};

export default async function CarsBrowsePage() {
  const listings = await fetchLatestCars(24);
  return (
    <PublicShell>
      <PublicCategoryHero verticalId="cars" total={listings.length} />
      {listings.length === 0 ? (
        <PublicCategoryEmptyState verticalId="cars" />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {listings.length} njoftime të publikuara së fundmi
            </Typography>
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {listings.map((listing) => (
                <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <CarCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}
