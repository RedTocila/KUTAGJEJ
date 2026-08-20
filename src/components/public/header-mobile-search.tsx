'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import { useSearchOverlay } from '@/contexts/search-overlay-context';
import { useCopy } from '@/hooks/use-copy';
import { ProductSearchIcon, productSearchBarSx } from '@/components/public/product-browse-chrome';

const HEADER_SEARCH_HEIGHT = 42;

/** Mobile header search control — opens the full-page search sheet. */
export function HeaderMobileSearch() {
  const t = useCopy();
  const { open, openSearch } = useSearchOverlay();

  return (
    <Box
      component="button"
      type="button"
      aria-label={t.common.openSearch}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={openSearch}
      sx={{
        flex: 1,
        minWidth: 0,
        display: { xs: 'flex', md: 'none' },
        ...productSearchBarSx(false),
        height: HEADER_SEARCH_HEIGHT,
        px: 1.5,
        appearance: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
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
