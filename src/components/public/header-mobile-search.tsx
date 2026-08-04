'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';

/** Mobile header search control — opens the full-page search experience. */
export function HeaderMobileSearch() {
  const t = useCopy();

  return (
    <Box
      component={RouterLink}
      href={paths.public.search}
      aria-label={t.common.openSearch}
      sx={{
        flex: 1,
        minWidth: 0,
        display: { xs: 'flex', md: 'none' },
        alignItems: 'center',
        height: 36,
        px: 1.25,
        borderRadius: 999,
        bgcolor: 'action.hover',
        color: 'text.secondary',
        textDecoration: 'none',
        '&:hover': { bgcolor: 'action.selected' },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
        <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <MagnifyingGlassIcon size={16} weight="bold" />
        </Box>
        <Typography
          component="span"
          noWrap
          sx={{ fontSize: '0.9375rem', fontWeight: 500, color: 'text.secondary' }}
        >
          {t.chrome.searchPlaceholder}
        </Typography>
      </Stack>
    </Box>
  );
}
