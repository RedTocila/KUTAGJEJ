'use client';

import * as React from 'react';
import { Suspense } from 'react';
import RouterLink from 'next/link';
import { Box, Button, Container, Grid, Stack, Typography, useScrollTrigger } from '@mui/material';

import {
  findVertical,
  isHomeVerticalId,
  localizeSearchCategory,
  localizeVertical,
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  type HomeVerticalId,
} from '@/lib/home-categories';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { paths } from '@/paths';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import { PortalIconBox } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useScrollRevealHidden } from '@/hooks/use-scroll-reveal-hidden';

import { CategoryBrowseControls } from './listing-filters/category-browse-controls';
import {
  OkazionBrowseControls,
  OkazionBrowseControlsFallback,
} from './listing-filters/okazion-browse-controls';
import { HomeVerticalIcon } from './home-vertical-icon';

/** Browse pages that share the quiet category hero (listing verticals + OKAZION). */
export type BrowseCategoryId = HomeVerticalId | 'okazion';

/**
 * Quiet header used by every public browse page (Real Estate, Cars, Jobs,
 * Marketplace, OKAZION) — page title, count, and browse controls.
 *
 * On mobile, fixes to the top and hides while scrolling down / reveals on scroll up
 * (back | category + search/tags). Desktop keeps a static in-flow hero.
 */
export function PublicCategoryHero({
  verticalId,
  total,
  cities,
}: {
  verticalId: BrowseCategoryId;
  total: number;
  cities: RealEstateCityDto[];
}) {
  const { language } = useLanguage();
  const t = useCopy();
  const label = isHomeVerticalId(verticalId)
    ? localizeVertical(verticalId, language).label
    : localizeSearchCategory(verticalId, language).label;
  const elevated = useScrollTrigger({ disableHysteresis: true, threshold: 8 });
  const chromeHidden = useScrollRevealHidden({ alwaysShowBelowY: 24 });
  const [mounted, setMounted] = React.useState(false);
  const barRef = React.useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const sync = () => setBarHeight(el.getBoundingClientRect().height);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [verticalId, total]);

  return (
    <>
      <Box
        ref={barRef}
        component="section"
        sx={(theme) => {
          const paperAlpha = theme.palette.mode === 'dark' ? 0.94 : 0.96;
          const frosted = `rgb(var(--mui-palette-background-paperChannel) / ${paperAlpha})`;
          const blur = 'saturate(180%) blur(14px)';
          const showFrost = mounted && elevated;

          return {
            position: { xs: 'fixed', md: 'static' },
            top: { xs: 0, md: 'auto' },
            left: { xs: 0, md: 'auto' },
            right: { xs: 0, md: 'auto' },
            zIndex: { xs: theme.zIndex.appBar, md: 'auto' },
            pt: {
              xs: 'max(10px, env(safe-area-inset-top, 0px))',
              md: 5,
            },
            pb: verticalId === 'okazion' ? { xs: 1.25, md: 2.5 } : { xs: 1.5, md: 5 },
            bgcolor: {
              xs: showFrost ? frosted : 'background.default',
              md: 'transparent',
            },
            backdropFilter: { xs: showFrost ? blur : 'none', md: 'none' },
            WebkitBackdropFilter: { xs: showFrost ? blur : 'none', md: 'none' },
            transform: {
              xs: chromeHidden ? 'translateY(-100%)' : 'translateY(0)',
              md: 'none',
            },
            transition: theme.transitions.create(['transform', 'background-color', 'backdrop-filter'], {
              duration: 220,
              easing: theme.transitions.easing.easeInOut,
            }),
            willChange: { xs: 'transform', md: 'auto' },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'background-color 0.2s ease',
            },
          };
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
            <ProductBackButton
              href={paths.home}
              aria-label={t.browse.backHomeAria}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, mt: 0.5 }}
            />
            {verticalId === 'okazion' ? (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.25,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: OKAZION_ACCENT_SOFT,
                  color: OKAZION_ACCENT,
                }}
              >
                <HomeVerticalIcon verticalId="okazion" size={22} />
              </Box>
            ) : (
              <PortalIconBox size={40}>
                <HomeVerticalIcon verticalId={verticalId} size={22} />
              </PortalIconBox>
            )}
            <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0, pt: 0.15 }}>
              <Typography
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.4rem', md: '1.75rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.015em',
                  minWidth: 0,
                }}
              >
                {label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {total > 0 ? t.browse.listingsCount(total) : t.browse.noListingsYet}
              </Typography>
            </Stack>
          </Stack>

          {isHomeVerticalId(verticalId) ? (
            <Suspense fallback={null}>
              <CategoryBrowseControls verticalId={verticalId} cities={cities} />
            </Suspense>
          ) : (
            <Suspense fallback={<OkazionBrowseControlsFallback />}>
              <OkazionBrowseControls />
            </Suspense>
          )}
        </Container>
      </Box>

      {/* Spacer only while the chrome is `position: fixed` on mobile */}
      <Box
        aria-hidden
        sx={{
          display: { xs: 'block', md: 'none' },
          height: barHeight || 'auto',
          minHeight: barHeight ? undefined : 120,
          pointerEvents: 'none',
          visibility: 'hidden',
        }}
      />
    </>
  );
}

/** Listing-count caption on browse grids — client so it can follow the active language. */
export function BrowseListingsCountCaption({
  total,
  shownCount,
  page,
  totalPages,
  pageSize,
  hasFilters,
  enableInfiniteScroll,
}: {
  total: number;
  shownCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasFilters: boolean;
  enableInfiniteScroll: boolean;
}) {
  const t = useCopy();
  const rangeStart = shownCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = shownCount === 0 ? 0 : (page - 1) * pageSize + shownCount;
  const text =
    totalPages > 1 && !enableInfiniteScroll
      ? t.browse.showingRange(rangeStart, rangeEnd, total)
      : hasFilters
        ? t.browse.filteredCount(shownCount, total)
        : t.browse.listingsCount(total);

  return (
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  );
}

/**
 * Quiet "no listings yet" state for browse pages.
 */
export function PublicCategoryEmptyState({ verticalId }: { verticalId: BrowseCategoryId }) {
  const t = useCopy();
  const isOkazion = verticalId === 'okazion';
  const ctaHref = isOkazion
    ? `${paths.user.realEstateListing}?okazion=1`
    : findVertical(verticalId).postHref;
  const ctaLabel = isOkazion ? t.browse.addOkazion : t.chrome.footerPostFree;
  const emptyCopy = isOkazion ? t.browse.emptyOkazion : t.browse.emptyState;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((idx) => (
          <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
            <Box
              sx={{
                height: '100%',
                minHeight: 200,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                p: 2.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ height: 12, width: '60%', borderRadius: 0.5, bgcolor: 'divider' }} />
              <Box sx={{ height: 10, width: '40%', borderRadius: 0.5, bgcolor: 'divider' }} />
              <Typography variant="caption" color="text.disabled" sx={{ mt: 'auto' }}>
                {t.browse.listingPlaceholder}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Box
        sx={{
          mt: 3,
          py: 4,
          textAlign: 'center',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {emptyCopy}
          </Typography>
          <Button
            component={RouterLink}
            href={ctaHref}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {ctaLabel}
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
