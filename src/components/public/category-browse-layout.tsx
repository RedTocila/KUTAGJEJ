import * as React from 'react';
import { Container, Grid, Stack, Typography } from '@mui/material';

import { BrowsePagination } from '@/components/public/listing-filters/browse-pagination';
import { PublicCategoryEmptyState, PublicCategoryHero } from '@/components/public/category-hero';
import { CategoryTopViewedSlider } from '@/components/public/category-top-viewed-slider';
import { PublicShell } from '@/components/public/public-shell';
import type { HomeVerticalId } from '@/lib/home-categories';
import type { TopViewedListing } from '@/lib/public-listings-client';
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
  /** Most-viewed listings for the category slider (max 10). */
  topViewed?: TopViewedListing[];
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
  topViewed = [],
  children,
}: CategoryBrowseLayoutProps) {
  const rangeStart = shownCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = shownCount === 0 ? 0 : (page - 1) * pageSize + shownCount;

  return (
    <PublicShell hideHeaderBelowMd>
      <PublicCategoryHero verticalId={verticalId} total={total} cities={cities} />
      <CategoryTopViewedSlider verticalId={verticalId} listings={topViewed} />
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
