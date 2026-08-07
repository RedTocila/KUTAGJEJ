'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';
import { ProductSearchIcon, productSearchBarSx } from '@/components/public/product-browse-chrome';

const HEADER_SEARCH_HEIGHT = 42;

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
        ...productSearchBarSx(false),
        height: HEADER_SEARCH_HEIGHT,
        px: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
        <ProductSearchIcon />
        <Typography
          component="span"
          noWrap
          sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'text.secondary' }}
        >
          {t.chrome.searchPlaceholder}
        </Typography>
      </Stack>
    </Box>
  );
}
