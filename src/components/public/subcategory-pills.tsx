'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CurrencyEur as CurrencyEurIcon } from '@phosphor-icons/react/dist/ssr/CurrencyEur';
import { HouseLine as HouseLineIcon } from '@phosphor-icons/react/dist/ssr/HouseLine';
import { Key as KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';

import type { HomeVerticalId } from '@/lib/home-categories';
import { localizeSubcategories, type SubcategoryItem } from '@/lib/home-subcategories';
import { paths } from '@/paths';
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

const PRICE_PILL_VERTICALS = new Set<HomeVerticalId>(['real-estate', 'cars', 'marketplace']);

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
  const target = new URLSearchParams(hrefQuery);
  next.delete('page');

  // Clear-only pill (e.g. jobs "Other"): drop the primary subcategory dim.
  // Otherwise replace only the keys this pill sets so `tx` and `cat` can coexist.
  if (![...target.keys()].length) {
    if (dimKey) next.delete(dimKey);
  } else {
    for (const key of new Set(target.keys())) {
      next.delete(key);
    }
    for (const [key, value] of target.entries()) {
      next.append(key, value);
    }
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
export function SubcategoryPills({
  verticalId,
  onOpenPriceFilter,
  priceFilterActive = false,
}: {
  verticalId: HomeVerticalId;
  /** Browse-only: opens the filter drawer scrolled to the price range section. */
  onOpenPriceFilter?: () => void;
  priceFilterActive?: boolean;
}) {
  return (
    <React.Suspense
      fallback={
        <SubcategoryPillsList
          verticalId={verticalId}
          isPillActive={() => false}
          onOpenPriceFilter={onOpenPriceFilter}
          priceFilterActive={priceFilterActive}
        />
      }
    >
      <SubcategoryPillsWithParams
        verticalId={verticalId}
        onOpenPriceFilter={onOpenPriceFilter}
        priceFilterActive={priceFilterActive}
      />
    </React.Suspense>
  );
}

function SubcategoryPillsWithParams({
  verticalId,
  onOpenPriceFilter,
  priceFilterActive,
}: {
  verticalId: HomeVerticalId;
  onOpenPriceFilter?: () => void;
  priceFilterActive: boolean;
}) {
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

  return (
    <SubcategoryPillsList
      verticalId={verticalId}
      isPillActive={isPillActive}
      searchParams={searchParams}
      onOpenPriceFilter={onOpenPriceFilter}
      priceFilterActive={priceFilterActive}
    />
  );
}

function SubcategoryPillsList({
  verticalId,
  isPillActive,
  searchParams,
  onOpenPriceFilter,
  priceFilterActive = false,
}: {
  verticalId: HomeVerticalId;
  isPillActive: (href: string) => boolean;
  searchParams?: URLSearchParams;
  onOpenPriceFilter?: () => void;
  priceFilterActive?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = useCopy();
  const baseItems = localizeSubcategories(verticalId, language);
  const items = React.useMemo((): SubcategoryItem[] | null => {
    if (!baseItems?.length) return null;
    if (verticalId !== 'real-estate') return baseItems;
    const txPills: SubcategoryItem[] = [
      {
        label: t.common.forRent,
        labelEn: t.common.forRent,
        Icon: KeyIcon as PhosphorIcon,
        href: `${paths.public.realEstate}?tx=rent`,
      },
      {
        label: t.common.forSale,
        labelEn: t.common.forSale,
        Icon: HouseLineIcon as PhosphorIcon,
        href: `${paths.public.realEstate}?tx=sale`,
      },
    ];
    return [...txPills, ...baseItems];
  }, [baseItems, t.common.forRent, t.common.forSale, verticalId]);
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

  const showPricePill = Boolean(onOpenPriceFilter) && PRICE_PILL_VERTICALS.has(verticalId);
  // Real estate: after For sale. Cars / marketplace: lead the row (no tx pills).
  const priceAfterIndex =
    verticalId === 'real-estate' ? items.findIndex((item) => item.href.includes('tx=sale')) : -1;

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
        {showPricePill && priceAfterIndex < 0 ? (
          <ProductTag
            label={t.browse.price}
            icon={CurrencyEurIcon as PhosphorIcon}
            bareIcon
            active={priceFilterActive}
            onClick={() => onOpenPriceFilter?.()}
          />
        ) : null}
        {items.map((item, index) => (
          <React.Fragment key={`${item.href}-${item.label}`}>
            <ProductTag
              href={item.href}
              label={item.label}
              icon={item.Icon}
              bareIcon
              active={isPillActive(item.href)}
              onClick={onPillClick(item.href)}
            />
            {showPricePill && index === priceAfterIndex ? (
              <ProductTag
                label={t.browse.price}
                icon={CurrencyEurIcon as PhosphorIcon}
                bareIcon
                active={priceFilterActive}
                onClick={() => onOpenPriceFilter?.()}
              />
            ) : null}
          </React.Fragment>
        ))}
      </Stack>
    </Box>
  );
}
