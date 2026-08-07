'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';

import { HOME_SUBCATEGORIES } from '@/lib/home-subcategories';
import type { HomeVerticalId } from '@/lib/home-categories';
import { ProductTag } from '@/components/public/product-browse-chrome';

/**
 * Horizontally-scrollable strip of subcategory pills shown beneath each
 * section header. One row; swipe / scroll to see the rest.
 *
 * Wrapped in Suspense because `useSearchParams` requires a boundary for
 * static prerender (e.g. homepage sections).
 */
export function SubcategoryPills({ verticalId }: { verticalId: HomeVerticalId }) {
  return (
    <React.Suspense fallback={<SubcategoryPillsList verticalId={verticalId} isPillActive={() => false} />}>
      <SubcategoryPillsWithParams verticalId={verticalId} />
    </React.Suspense>
  );
}

function SubcategoryPillsWithParams({ verticalId }: { verticalId: HomeVerticalId }) {
  const searchParams = useSearchParams();

  const isPillActive = React.useCallback(
    (href: string) => {
      const [, query = ''] = href.split('?');
      if (!query) return searchParams.toString() === '';
      const target = new URLSearchParams(query);
      for (const [key, value] of target.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [searchParams],
  );

  return <SubcategoryPillsList verticalId={verticalId} isPillActive={isPillActive} />;
}

function SubcategoryPillsList({
  verticalId,
  isPillActive,
}: {
  verticalId: HomeVerticalId;
  isPillActive: (href: string) => boolean;
}) {
  const items = HOME_SUBCATEGORIES[verticalId];
  if (!items || items.length === 0) return null;

  return (
    <Box
      role="navigation"
      aria-label="Nënkategoritë"
      sx={{
        mt: { xs: 1.5, md: 2 },
        mb: 1.5,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ pr: 3, width: 'max-content', flexWrap: 'nowrap' }}>
        {items.map((item) => (
          <ProductTag
            key={`${item.href}-${item.label}`}
            href={item.href}
            label={item.label}
            icon={item.Icon}
            active={isPillActive(item.href)}
          />
        ))}
      </Stack>
    </Box>
  );
}
