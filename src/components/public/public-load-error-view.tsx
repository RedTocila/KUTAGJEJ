'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { useRouter } from 'next/navigation';

import { paths } from '@/paths';
import { productButtonSx } from '@/styles/product-sx';

/**
 * Shown when a listing/profile fetch fails transiently (API timeout / 5xx).
 * Do not use for genuine missing resources — those still use the 404 page.
 */
export function PublicLoadErrorView({
  title = 'Nuk u ngarkua',
  description = 'Lidhja me serverin dështoi përkohësisht. Provoni përsëri.',
  homeHref = paths.home,
}: {
  title?: string;
  description?: string;
  homeHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: { xs: '70dvh', md: '60vh' },
        px: 2,
        py: 6,
      }}
    >
      <Stack spacing={2.5} sx={{ alignItems: 'center', maxWidth: 420, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body1">
          {description}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ width: '100%', justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={busy}
            startIcon={React.createElement(ArrowClockwiseIcon, { size: 18, weight: 'bold' })}
            onClick={() => {
              setBusy(true);
              router.refresh();
              window.setTimeout(() => setBusy(false), 2500);
            }}
            sx={productButtonSx}
          >
            Provo përsëri
          </Button>
          <Button
            component={RouterLink}
            href={homeHref}
            variant="outlined"
            startIcon={React.createElement(ArrowLeftIcon, { size: 18, weight: 'bold' })}
            sx={productButtonSx}
          >
            Faqja kryesore
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
