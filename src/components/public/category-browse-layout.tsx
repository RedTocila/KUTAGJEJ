import * as React from 'react';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import type { HomeVerticalId } from '@/lib/home-categories';
import { hasActiveBrowseFilters } from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

interface CategoryBrowseLayoutProps {
  verticalId: HomeVerticalId;
  total: number;
  shownCount: number;
  hasFilters: boolean;
  cities: RealEstateCityDto[];
  children: React.ReactNode;
}

export function CategoryBrowseLayout({
  verticalId,
  total,
  shownCount,
  hasFilters,
  cities,
  children,
}: CategoryBrowseLayoutProps) {
  return (
    <PublicShell>
      <PublicCategoryHero verticalId={verticalId} total={total} cities={cities} />
      {shownCount === 0 ? (
        <PublicCategoryEmptyState verticalId={verticalId} />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {hasFilters
                ? `${shownCount} nga ${total.toLocaleString('en-GB')} njoftime`
                : `${shownCount} njoftime të publikuara së fundmi`}
            </Typography>
            {children}
          </Stack>
        </Container>
      )}
    </PublicShell>
  );
}

export function CategoryBrowseGrid({ children }: { children: React.ReactNode }) {
  return (
    <Grid container spacing={{ xs: 2, md: 2.5 }}>
      {children}
    </Grid>
  );
}
