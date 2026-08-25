'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { paths } from '@/paths';
import { productButtonSx } from '@/styles/product-sx';

export type AppErrorPageProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  /** When set, shows a primary Reload button that calls this handler. */
  onReload?: () => void;
  reloadLabel?: string;
  goBackLabel?: string;
  goBackHref?: string;
};

/**
 * Shared full-page error / empty-route layout (404, 500, load failures).
 */
export function AppErrorPage({
  imageSrc,
  imageAlt,
  title,
  description,
  onReload,
  reloadLabel = 'Reload',
  goBackLabel = 'Go back',
  goBackHref = paths.home,
}: AppErrorPageProps) {
  const historyBack = useHistoryBackProps(goBackHref);
  const [busy, setBusy] = React.useState(false);

  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: { xs: '70dvh', md: '100%' },
        px: 2,
        py: { xs: 4, md: 6 },
      }}
    >
      <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 'md', width: '100%' }}>
        <Box
          component="img"
          alt={imageAlt}
          src={imageSrc}
          sx={{ display: 'block', height: 'auto', maxWidth: '100%', width: 360 }}
        />
        <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body1" sx={{ textAlign: 'center', maxWidth: 520 }}>
          {description}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}
        >
          {onReload ? (
            <Button
              variant="contained"
              disabled={busy}
              startIcon={React.createElement(ArrowClockwiseIcon, { size: 18, weight: 'bold' })}
              onClick={() => {
                setBusy(true);
                onReload();
                window.setTimeout(() => setBusy(false), 2500);
              }}
              sx={{ ...productButtonSx, minWidth: 140 }}
            >
              {reloadLabel}
            </Button>
          ) : null}
          <Button
            component={RouterLink}
            href={historyBack.href}
            variant={onReload ? 'outlined' : 'contained'}
            startIcon={React.createElement(ArrowLeftIcon, { size: 18, weight: 'bold' })}
            data-history-back=""
            onClick={historyBack.onClick}
            sx={{ ...productButtonSx, minWidth: 140 }}
          >
            {goBackLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
