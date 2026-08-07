'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { useLanguage } from '@/hooks/use-language';
import {
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  localizeHomeVerticals,
  localizeSearchCategory,
  type HomeVerticalId,
} from '@/lib/home-categories';
import {
  buildBrowseUrlQuery,
  parseOkazionBrowseParams,
  type BrowseOkazionFilters,
} from '@/lib/listing-filters';
import { paths } from '@/paths';
import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
  ProductTag,
} from '@/components/public/product-browse-chrome';
import { ListingKeywordSearchInput } from '@/components/public/listing-filters/listing-keyword-search-input';

const OKAZION_SEARCH_ACCENT = { color: OKAZION_ACCENT, soft: OKAZION_ACCENT_SOFT } as const;

/** Same verticals as create-OKAZION — no directory profiles. */
const OKAZION_BROWSE_VERTICAL_IDS = new Set<HomeVerticalId>([
  'real-estate',
  'cars',
  'jobs',
  'marketplace',
]);

const OKAZION_VERTICAL_ICONS: Record<
  'real-estate' | 'cars' | 'jobs' | 'marketplace',
  PhosphorIcon
> = {
  'real-estate': BuildingsIcon,
  cars: CarProfileIcon,
  jobs: BriefcaseIcon,
  marketplace: StorefrontIcon,
};

const toolbarRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  minHeight: PRODUCT_BROWSE_CONTROL_HEIGHT,
} as const;

function buildOkazionHref(filters: BrowseOkazionFilters): string {
  return `${paths.public.okazion}${buildBrowseUrlQuery(filters)}`;
}

export function OkazionBrowseControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const applied = React.useMemo(
    () => parseOkazionBrowseParams(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const verticals = React.useMemo(
    () => localizeHomeVerticals(language).filter((v) => OKAZION_BROWSE_VERTICAL_IDS.has(v.id)),
    [language],
  );
  const searchPlaceholder = React.useMemo(
    () => localizeSearchCategory('okazion', language).searchPlaceholder,
    [language],
  );

  const applyKeyword = React.useCallback(
    (nextQ: string) => {
      const next: BrowseOkazionFilters = {
        ...applied,
        q: nextQ.trim() || undefined,
      };
      React.startTransition(() => {
        router.push(`${pathname}${buildBrowseUrlQuery(next)}`);
      });
    },
    [applied, pathname, router],
  );

  return (
    <Box component="section" aria-label="Kontrollet e kërkimit" sx={{ mt: { xs: 1.25, md: 2 } }}>
      <Box sx={toolbarRowSx}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <ListingKeywordSearchInput
            value={applied.q ?? ''}
            placeholder={searchPlaceholder}
            onChange={applyKeyword}
            accent={OKAZION_SEARCH_ACCENT}
          />
        </Box>
      </Box>

      <Box
        role="navigation"
        aria-label="Kategoritë kryesore"
        sx={{
          mt: { xs: 1.5, md: 2 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          maskImage: 'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%)',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ pr: 3, width: 'max-content', maxWidth: 'none', flexWrap: 'nowrap' }}>
          {verticals.map((vertical) => {
            const active = applied.kind === vertical.id;
            const href = buildOkazionHref({
              q: applied.q,
              kind: active ? undefined : vertical.id,
            });
            return (
              <ProductTag
                key={vertical.id}
                href={href}
                label={vertical.label}
                icon={OKAZION_VERTICAL_ICONS[vertical.id as keyof typeof OKAZION_VERTICAL_ICONS]}
                active={active}
                accent={OKAZION_SEARCH_ACCENT}
              />
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}

/** Static fallback while search params resolve (keeps layout stable). */
export function OkazionBrowseControlsFallback() {
  return (
    <Box component="section" aria-hidden sx={{ mt: { xs: 1.25, md: 2 } }}>
      <Box sx={{ ...toolbarRowSx, opacity: 0.5 }}>
        <Box sx={{ flex: 1, height: PRODUCT_BROWSE_CONTROL_HEIGHT, borderRadius: 2.5, bgcolor: 'action.hover' }} />
      </Box>
      <Box
        sx={{
          mt: { xs: 1.5, md: 2 },
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          overscrollBehaviorX: 'contain',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: 'max-content', maxWidth: 'none', flexWrap: 'nowrap' }}>
          {(['real-estate', 'cars', 'jobs', 'marketplace'] as const).map((id) => (
            <Box
              key={id}
              sx={{
                height: 34,
                width: 88,
                borderRadius: 999,
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
