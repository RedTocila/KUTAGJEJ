import * as React from 'react';
import type { Metadata } from 'next';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { config } from '@/config';
import { fetchLatestBusinesses } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Biznese — restorante, bar & kafene | ${config.site.name}`,
  description:
    'Gjej restorante, bar, kafene dhe vende ngrënie në KuTaGjej — orare hapjeje, rezervime dhe çfarë ofrojnë. Posto aktivitetin tënd.',
  alternates: { canonical: paths.public.businesses },
  openGraph: {
    title: `Biznese | ${config.site.name}`,
    description: 'Restorante, bar, kafene dhe më shumë — me orar dhe rezervim në Shqipëri.',
    url: `${config.site.url}${paths.public.businesses}`,
    type: 'website',
  },
};

export default async function BusinessesBrowsePage() {
  const listings = await fetchLatestBusinesses(24);
  return (
    <PublicShell>
      <PublicCategoryHero verticalId="businesses" total={listings.length} />
      {listings.length === 0 ? (
        <PublicCategoryEmptyState verticalId="businesses" />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {listings.length} njoftime të publikuara së fundmi
            </Typography>
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {listings.map((listing) => (
                <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <DirectoryListingCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}
