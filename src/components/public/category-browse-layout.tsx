'use client';

import * as React from 'react';
import { Box, Container, Grid, Skeleton, Stack } from '@mui/material';

import { BrowseLoadProvider, type BrowseResolvedMeta } from '@/components/public/browse-load-context';
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
  /** False when the SSR listing request failed (empty is not trustworthy). */
  ssrOk?: boolean;
  children: React.ReactNode;
}

type BrowsePhase = 'loading' | 'empty' | 'ready';

function initialPhase(shownCount: number, recoverEmpty: boolean): BrowsePhase {
  if (shownCount > 0) return 'ready';
  if (recoverEmpty) return 'loading';
  return 'empty';
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
  ssrOk = true,
  children,
}: CategoryBrowseLayoutProps) {
  const isOkazion = verticalId === 'okazion';
  const recoverEmpty = shownCount === 0 && (!ssrOk || !hasFilters);
  const [phase, setPhase] = React.useState<BrowsePhase>(() => initialPhase(shownCount, recoverEmpty));
  const [liveTotal, setLiveTotal] = React.useState(total);
  const [liveShown, setLiveShown] = React.useState(shownCount);
  const [livePage, setLivePage] = React.useState(page);
  const [liveTotalPages, setLiveTotalPages] = React.useState(totalPages);

  React.useEffect(() => {
    setLiveTotal(total);
    setLiveShown(shownCount);
    setLivePage(page);
    setLiveTotalPages(totalPages);
    setPhase(initialPhase(shownCount, shownCount === 0 && (!ssrOk || !hasFilters)));
  }, [total, shownCount, page, totalPages, ssrOk, hasFilters]);

  const reportResolved = React.useCallback((meta: BrowseResolvedMeta) => {
    setLiveTotal(meta.total);
    setLiveShown(meta.shownCount);
    setLivePage(meta.page);
    setLiveTotalPages(meta.totalPages);
    if (meta.shownCount > 0) {
      setPhase('ready');
      return;
    }
    if (meta.ok) {
      setPhase('empty');
      return;
    }
    setPhase('loading');
  }, []);

  const showTopViewed = isHomeVerticalId(verticalId) && topViewed.length > 0 && phase !== 'loading';
  const pending = phase === 'loading';

  return (
    <PublicShell hideHeaderBelowMd>
      <OkazionTheme enabled={isOkazion}>
        <BrowseLoadProvider recoverEmpty={recoverEmpty} reportResolved={reportResolved}>
          <PublicCategoryHero
            verticalId={verticalId}
            total={liveTotal}
            cities={cities}
            pending={pending}
          />
          {showTopViewed ? (
            <CategoryTopViewedSlider verticalId={verticalId} listings={topViewed} />
          ) : null}
          {phase === 'empty' ? (
            <PublicCategoryEmptyState verticalId={verticalId} hasFilters={hasFilters} />
          ) : (
            <Container
              maxWidth="xl"
              sx={{
                pt: showTopViewed ? { xs: 1, md: 1.5 } : isOkazion ? { xs: 1.5, md: 3 } : { xs: 4, md: 6 },
                pb: { xs: 4, md: 6 },
                position: 'relative',
              }}
            >
              <Stack spacing={3}>
                {pending ? (
                  <Skeleton variant="text" animation="wave" width={168} />
                ) : (
                  <BrowseListingsCountCaption
                    total={liveTotal}
                    shownCount={liveShown}
                    page={livePage}
                    totalPages={liveTotalPages}
                    pageSize={pageSize}
                    hasFilters={hasFilters}
                    enableInfiniteScroll={enableInfiniteScroll}
                  />
                )}
                {children}
                {enableInfiniteScroll ? (
                  liveTotalPages > 1 && phase === 'ready' ? (
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
                        <BrowsePagination page={livePage} totalPages={liveTotalPages} />
                      </React.Suspense>
                    </Box>
                  ) : null
                ) : (
                  <React.Suspense fallback={null}>
                    <BrowsePagination page={livePage} totalPages={liveTotalPages} />
                  </React.Suspense>
                )}
              </Stack>
            </Container>
          )}
        </BrowseLoadProvider>
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
