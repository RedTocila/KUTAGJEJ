import * as React from 'react';
import type { Metadata } from 'next';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { config } from '@/config';
import { fetchLatestMarketplace } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Tregu — Elektronikë, mobilje, veshje dhe shumë më tepër',
  description:
    'Shfleto njoftimet e tregut online — elektronikë, mobilje, veshje, libra, sport, lodra dhe shumë më tepër. Shitje të reja çdo ditë në KuTaGjej.',
  alternates: { canonical: paths.public.marketplace },
  openGraph: {
    title: `Tregu | ${config.site.name}`,
    description: 'Tregu online më i thjeshtë — gjej dhe shit gjithçka në KuTaGjej.',
    url: `${config.site.url}${paths.public.marketplace}`,
    type: 'website',
  },
};

export default async function MarketplaceBrowsePage() {
  const listings = await fetchLatestMarketplace(24);
  return (
    <PublicShell>
      <PublicCategoryHero verticalId="marketplace" total={listings.length} />
      {listings.length === 0 ? (
        <PublicCategoryEmptyState verticalId="marketplace" />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {listings.length} njoftime të publikuara së fundmi
            </Typography>
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {listings.map((listing) => (
                <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <MarketplaceCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}
