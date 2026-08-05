'use client';

import * as React from 'react';
import { Suspense } from 'react';
import RouterLink from 'next/link';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';

import {
  findSearchCategory,
  findVertical,
  isHomeVerticalId,
  OKAZION_RED,
  OKAZION_RED_SOFT,
  type HomeVerticalId,
} from '@/lib/home-categories';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { paths } from '@/paths';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import { PortalIconBox } from '@/components/user/portal-cards';

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
  const label = isHomeVerticalId(verticalId)
    ? findVertical(verticalId).label
    : findSearchCategory(verticalId).label;
  return (
    <Box
      component="section"
      sx={{
        pt: { xs: 'max(12px, env(safe-area-inset-top, 0px))', md: 5 },
        pb: verticalId === 'okazion' ? { xs: 1.25, md: 2.5 } : { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <ProductBackButton
            href={paths.home}
            aria-label="Kthehu në faqen kryesore"
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
                bgcolor: OKAZION_RED_SOFT,
                color: OKAZION_RED,
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
              {total > 0 ? `${total.toLocaleString('en-GB')} njoftime` : 'Asnjë njoftim ende'}
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
  );
}

/**
 * Quiet "no listings yet" state for browse pages.
 */
export function PublicCategoryEmptyState({ verticalId }: { verticalId: BrowseCategoryId }) {
  const isOkazion = verticalId === 'okazion';
  const ctaHref = isOkazion
    ? `${paths.user.realEstateListing}?okazion=1`
    : findVertical(verticalId).postHref;
  const ctaLabel = isOkazion ? 'Shto OKAZION' : 'Posto njoftim falas';
  const emptyCopy = isOkazion
    ? 'Nuk ka OKAZION aktive për momentin. Kontrollo përsëri së shpejti.'
    : 'Nuk ka njoftime ende — bëhu i pari.';

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
                Hapësirë për njoftim
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
