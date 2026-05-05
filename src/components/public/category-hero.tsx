'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { findVertical, type HomeVerticalId } from '@/lib/home-categories';

import { SubcategoryPills } from './subcategory-pills';
import { VerticalIcon } from './vertical-icon';

/**
 * Quiet header used by every public browse page (Real Estate, Cars, Jobs,
 * Marketplace) — page title, count, and a single "post" CTA. Visually
 * consistent with the homepage's restrained aesthetic.
 */
export function PublicCategoryHero({
  verticalId,
  total,
}: {
  verticalId: HomeVerticalId;
  total: number;
}) {
  const vertical = findVertical(verticalId);
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 4, md: 5 },
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="xl">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              aria-hidden
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.75,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                p: 0.75,
              }}
            >
              <VerticalIcon verticalId={verticalId} size={36} decorative />
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.4rem', md: '1.75rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.015em',
                }}
              >
                {vertical.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total > 0 ? `${total.toLocaleString('en-GB')} njoftime` : 'Asnjë njoftim ende'}
              </Typography>
            </Stack>
          </Stack>
          <Button
            component={RouterLink}
            href={vertical.postHref}
            variant="contained"
            size="medium"
            startIcon={React.createElement(PlusIcon, { size: 16, weight: 'bold' })}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              alignSelf: { xs: 'flex-start', sm: 'auto' },
            }}
          >
            Posto njoftim
          </Button>
        </Stack>

        <SubcategoryPills verticalId={verticalId} />
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
