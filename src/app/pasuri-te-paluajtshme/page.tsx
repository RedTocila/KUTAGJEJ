import * as React from 'react';
import type { Metadata } from 'next';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { config } from '@/config';
import { fetchLatestRealEstate } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Prona — Apartamente, vila & ambiente biznesi',
  description:
    'Shfleto njoftimet e fundit për shtëpi, apartamente, vila, ambiente biznesi, dyqane dhe toka në KuTaGjej. Posto njoftim falas dhe gjej blerës ose qiramarrës shpejt.',
  alternates: { canonical: paths.public.realEstate },
  openGraph: {
    title: `Prona | ${config.site.name}`,
    description: 'Apartamente, vila, dyqane dhe toka në Shqipëri — të gjitha në KuTaGjej.',
    url: `${config.site.url}${paths.public.realEstate}`,
    type: 'website',
  },
};

export default async function RealEstateBrowsePage() {
  const listings = await fetchLatestRealEstate(24);
  return (
    <PublicShell>
      <PublicCategoryHero verticalId="real-estate" total={listings.length} />
      {listings.length === 0 ? (
        <PublicCategoryEmptyState verticalId="real-estate" />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {listings.length} njoftime të publikuara së fundmi
            </Typography>
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {listings.map((listing) => (
                <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <RealEstateCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}
