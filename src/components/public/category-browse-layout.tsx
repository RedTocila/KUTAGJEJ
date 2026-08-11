import * as React from 'react';
import { Box, Container, Grid, Stack } from '@mui/material';

import { BrowsePagination } from '@/components/public/listing-filters/browse-pagination';
import {
  BrowseListingsCountCaption,
  PublicCategoryEmptyState,
  PublicCategoryHero,
  type BrowseCategoryId,
} from '@/components/public/category-hero';
import { CategoryTopViewedSlider } from '@/components/public/category-top-viewed-slider';
import { PublicShell } from '@/components/public/public-shell';
import { OkazionTheme } from '@/components/user/okazion-theme';
import { isHomeVerticalId } from '@/lib/home-categories';
import type { TopViewedListing } from '@/lib/public-listings-client';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

interface CategoryBrowseLayoutProps {
  verticalId: BrowseCategoryId;
  total: number;
  shownCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasFilters: boolean;
  cities: RealEstateCityDto[];
  /** Featured listings for the category card (most-viewed, or highest-rated for businesses/professionals). */
  topViewed?: TopViewedListing[];
  /** Append pages on scroll instead of paging the whole route. */
  enableInfiniteScroll?: boolean;
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
  enableInfiniteScroll = false,
  children,
}: CategoryBrowseLayoutProps) {
  const isOkazion = verticalId === 'okazion';

  return (
    <PublicShell hideHeaderBelowMd>
      <OkazionTheme enabled={isOkazion}>
        <PublicCategoryHero verticalId={verticalId} total={total} cities={cities} />
        {isHomeVerticalId(verticalId) ? (
          <CategoryTopViewedSlider verticalId={verticalId} listings={topViewed} />
        ) : null}
        {shownCount === 0 ? (
          <PublicCategoryEmptyState verticalId={verticalId} />
        ) : (
          <Container
            maxWidth="xl"
            sx={{
              pt: isOkazion ? { xs: 1.5, md: 3 } : { xs: 4, md: 6 },
              pb: { xs: 4, md: 6 },
              position: 'relative',
            }}
          >
            <Stack spacing={3}>
              <BrowseListingsCountCaption
                total={total}
                shownCount={shownCount}
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                hasFilters={hasFilters}
                enableInfiniteScroll={enableInfiniteScroll}
              />
              {children}
              {enableInfiniteScroll ? (
                totalPages > 1 ? (
                  <Box
                    component="nav"
                    aria-label="Pagination"
                    sx={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  >
                    <React.Suspense fallback={null}>
                      <BrowsePagination page={page} totalPages={totalPages} />
                    </React.Suspense>
                  </Box>
                ) : null
              ) : (
                <React.Suspense fallback={null}>
                  <BrowsePagination page={page} totalPages={totalPages} />
                </React.Suspense>
              )}
            </Stack>
          </Container>
        )}
      </OkazionTheme>
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
