'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';

import type { HomeVerticalId } from '@/lib/home-categories';
import { localizeSubcategories } from '@/lib/home-subcategories';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { ProductTag } from '@/components/public/product-browse-chrome';

const SUBCATEGORY_PARAM: Partial<Record<HomeVerticalId, string>> = {
  'real-estate': 'cat',
  cars: 'type',
  jobs: 'industry',
  marketplace: 'cat',
  businesses: 'type',
  professionals: 'type',
};

function mergeSubcategoryHref(
  pathname: string,
  current: URLSearchParams,
  href: string,
  verticalId: HomeVerticalId
): string {
  const [hrefPath, hrefQuery = ''] = href.split('?');
  if (hrefPath !== pathname) return href;

  const next = new URLSearchParams(current.toString());
  const dimKey = SUBCATEGORY_PARAM[verticalId];
  next.delete('page');
  if (dimKey) next.delete(dimKey);

  const target = new URLSearchParams(hrefQuery);
  for (const [key, value] of target.entries()) {
    next.delete(key);
    next.append(key, value);
  }

  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

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
      if (!query) {
        const dimKey = SUBCATEGORY_PARAM[verticalId];
        return dimKey ? !searchParams.get(dimKey) : searchParams.toString() === '';
      }
      const target = new URLSearchParams(query);
      for (const [key, value] of target.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [searchParams, verticalId]
  );

  return <SubcategoryPillsList verticalId={verticalId} isPillActive={isPillActive} searchParams={searchParams} />;
}

function SubcategoryPillsList({
  verticalId,
  isPillActive,
  searchParams,
}: {
  verticalId: HomeVerticalId;
  isPillActive: (href: string) => boolean;
  searchParams?: URLSearchParams;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = useCopy();
  const items = localizeSubcategories(verticalId, language);
  if (!items || items.length === 0) return null;

  const onPillClick = (href: string) => (event: React.MouseEvent<HTMLElement>) => {
    const [hrefPath] = href.split('?');
    if (hrefPath !== pathname) return;
    event.preventDefault();
    const nextHref = searchParams ? mergeSubcategoryHref(pathname, searchParams, href, verticalId) : href;
    React.startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  };

  return (
    <Box
      role="navigation"
      aria-label={t.browse.subcategoriesAria}
      data-no-tab-swipe
      sx={{
        mt: { xs: 1.5, md: 2 },
        mb: 1.5,
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ pr: 3, width: 'max-content', maxWidth: 'none', flexWrap: 'nowrap' }}>
        {items.map((item) => (
          <ProductTag
            key={`${item.href}-${item.label}`}
            href={item.href}
            label={item.label}
            icon={item.Icon}
            bareIcon
            active={isPillActive(item.href)}
            onClick={onPillClick(item.href)}
          />
        ))}
      </Stack>
    </Box>
  );
}
