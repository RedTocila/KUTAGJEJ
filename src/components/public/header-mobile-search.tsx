'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import { useSearchOverlay } from '@/contexts/search-overlay-context';
import { useCopy } from '@/hooks/use-copy';
import { MOBILE_SEARCH_BAR_HEIGHT_PX } from '@/lib/mobile-layout';
import {
  ProductSearchIcon,
  productChromeSubtleBg,
  productChromeSubtleHoverBg,
  productSearchBarSx,
} from '@/components/public/product-browse-chrome';

/** Header search control — opens the full-page search sheet. */
export function HeaderSearchBar({
  allBreakpoints = false,
}: {
  /** When true, show on desktop as well (dashboard header). */
  allBreakpoints?: boolean;
}) {
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
        display: allBreakpoints ? 'flex' : { xs: 'flex', md: 'none' },
        ...productSearchBarSx(false),
        height: MOBILE_SEARCH_BAR_HEIGHT_PX,
        maxWidth: allBreakpoints ? { md: 520 } : undefined,
        px: 1.5,
        appearance: 'none',
        WebkitAppearance: 'none',
        cursor: 'pointer',
        font: 'inherit',
        textAlign: 'left',
        bgcolor: productChromeSubtleBg,
        '&:hover': { bgcolor: productChromeSubtleHoverBg },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
        <ProductSearchIcon />
        <Typography
          component="span"
          noWrap
          sx={{
            fontSize: '0.9rem',
            fontWeight: 500,
            color: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'text.secondary',
          }}
        >
          {t.chrome.searchPlaceholder}
        </Typography>
      </Stack>
    </Box>
  );
}

/** @deprecated Prefer `HeaderSearchBar` — kept for existing public header imports. */
export function HeaderMobileSearch() {
  return <HeaderSearchBar />;
}
