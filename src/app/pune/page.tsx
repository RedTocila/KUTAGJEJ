import * as React from 'react';
import type { Metadata } from 'next';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { config } from '@/config';
import { fetchLatestJobs } from '@/lib/public-listings-client';
import { paths } from '@/paths';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Punë — Vende të lira pune në Shqipëri',
  description:
    'Gjej vendin e ri të punës — full-time, part-time, remote, freelance dhe sezonale. Shfleto njoftimet e reja për punë në KuTaGjej.',
  alternates: { canonical: paths.public.jobs },
  openGraph: {
    title: `Punë | ${config.site.name}`,
    description: 'Vende pune në Shqipëri — të gjitha pozicionet, qytetet dhe industritë.',
    url: `${config.site.url}${paths.public.jobs}`,
    type: 'website',
  },
};

export default async function JobsBrowsePage() {
  const listings = await fetchLatestJobs(24);
  return (
    <PublicShell>
      <PublicCategoryHero verticalId="jobs" total={listings.length} />
      {listings.length === 0 ? (
        <PublicCategoryEmptyState verticalId="jobs" />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {listings.length} oferta të publikuara së fundmi
            </Typography>
            <Grid container spacing={{ xs: 2, md: 2.5 }}>
              {listings.map((listing) => (
                <Grid key={listing.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <JobCard listing={listing} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}
