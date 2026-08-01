'use client';

import * as React from 'react';
import { Suspense } from 'react';
import RouterLink from 'next/link';
import { Box, Button, Container, Grid, IconButton, Stack, Typography } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { findVertical, type HomeVerticalId } from '@/lib/home-categories';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { paths } from '@/paths';

import { CategoryBrowseControls } from './listing-filters/category-browse-controls';
import { HomeVerticalIcon } from './home-vertical-icon';

/**
 * Quiet header used by every public browse page (Real Estate, Cars, Jobs,
 * Marketplace) — page title, count, and browse controls.
 */
export function PublicCategoryHero({
  verticalId,
  total,
  cities,
}: {
  verticalId: HomeVerticalId;
  total: number;
  cities: RealEstateCityDto[];
}) {
  const vertical = findVertical(verticalId);
  return (
    <Box
      component="section"
      sx={{
        pt: { xs: 'max(12px, env(safe-area-inset-top, 0px))', md: 5 },
        pb: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
          <IconButton
            component={RouterLink}
            href={paths.home}
            aria-label="Kthehu në faqen kryesore"
            size="small"
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              mt: 0.5,
              flexShrink: 0,
              width: 36,
              height: 36,
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <ArrowLeftIcon size={18} weight="bold" />
          </IconButton>
          <Box
            sx={{
              width: 40,
              height: 40,
              mt: 0.25,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              color: 'primary.main',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)'
                  : 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
            }}
          >
            <HomeVerticalIcon verticalId={verticalId} size={22} />
          </Box>
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
              {vertical.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {total > 0 ? `${total.toLocaleString('en-GB')} njoftime` : 'Asnjë njoftim ende'}
            </Typography>
          </Stack>
        </Stack>

        <Suspense fallback={null}>
          <CategoryBrowseControls verticalId={verticalId} cities={cities} />
        </Suspense>
      </Container>
    </Box>
  );
}

/**
 * Quiet "no listings yet" state for browse pages.
 */
export function PublicCategoryEmptyState({ verticalId }: { verticalId: HomeVerticalId }) {
  const vertical = findVertical(verticalId);
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
            Nuk ka njoftime ende — bëhu i pari.
          </Typography>
          <Button
            component={RouterLink}
            href={vertical.postHref}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Posto njoftim falas
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}
