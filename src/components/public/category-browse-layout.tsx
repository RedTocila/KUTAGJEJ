import * as React from 'react';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { BrowsePagination } from '@/components/public/listing-filters/browse-pagination';
import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { PublicShell } from '@/components/public/public-shell';
import type { HomeVerticalId } from '@/lib/home-categories';
import { hasActiveBrowseFilters } from '@/lib/listing-filters';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

interface CategoryBrowseLayoutProps {
  verticalId: HomeVerticalId;
  total: number;
  shownCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasFilters: boolean;
  cities: RealEstateCityDto[];
  children: React.ReactNode;
}

export function CategoryBrowseLayout({
  verticalId,
  total,
  shownCount,
  page,
  totalPages,
  pageSize,
  hasFilters,
  cities,
  children,
}: CategoryBrowseLayoutProps) {
  const rangeStart = shownCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = shownCount === 0 ? 0 : (page - 1) * pageSize + shownCount;

  return (
    <PublicShell>
      <PublicCategoryHero verticalId={verticalId} total={total} cities={cities} />
      {shownCount === 0 ? (
        <PublicCategoryEmptyState verticalId={verticalId} />
      ) : (
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {totalPages > 1
                ? `Shfaqen ${rangeStart.toLocaleString('en-GB')}–${rangeEnd.toLocaleString('en-GB')} nga ${total.toLocaleString('en-GB')} njoftime`
                : hasFilters
                  ? `${shownCount} nga ${total.toLocaleString('en-GB')} njoftime`
                  : `${total.toLocaleString('en-GB')} njoftime`}
            </Typography>
            {children}
            <React.Suspense fallback={null}>
              <BrowsePagination page={page} totalPages={totalPages} />
            </React.Suspense>
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
