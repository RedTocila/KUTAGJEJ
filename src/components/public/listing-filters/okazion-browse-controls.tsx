'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

import { useLanguage } from '@/hooks/use-language';
import {
  OKAZION_RED,
  OKAZION_RED_SOFT,
  localizeHomeVerticals,
  localizeSearchCategory,
} from '@/lib/home-categories';
import {
  buildBrowseUrlQuery,
  parseOkazionBrowseParams,
  type BrowseOkazionFilters,
} from '@/lib/listing-filters';
import { paths } from '@/paths';
import { PRODUCT_BROWSE_CONTROL_HEIGHT } from '@/components/public/product-browse-chrome';
import { ListingKeywordSearchInput } from '@/components/public/listing-filters/listing-keyword-search-input';
import { HomeVerticalIcon } from '@/components/public/home-vertical-icon';

const OKAZION_SEARCH_ACCENT = { color: OKAZION_RED, soft: OKAZION_RED_SOFT } as const;

/** Same verticals as create-OKAZION — no directory profiles. */
const OKAZION_BROWSE_VERTICAL_IDS = new Set<'real-estate' | 'cars' | 'jobs' | 'marketplace'>([
  'real-estate',
  'cars',
  'jobs',
  'marketplace',
]);

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

      <Stack
        role="navigation"
        aria-label="Kategoritë kryesore"
        direction="row"
        sx={{
          mt: { xs: 1.5, md: 2 },
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {verticals.map((vertical) => {
          const active = applied.kind === vertical.id;
          const href = buildOkazionHref({
            q: applied.q,
            kind: active ? undefined : vertical.id,
          });
          return (
            <Stack
              key={vertical.id}
              component={RouterLink}
              href={href}
              spacing={0.45}
              sx={{
                flex: 1,
                minWidth: 0,
                alignItems: 'center',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                '&:hover .okazion-cat-circle': {
                  borderColor: OKAZION_RED,
                  bgcolor: OKAZION_RED_SOFT,
                },
                '&:hover .okazion-cat-label': {
                  color: OKAZION_RED,
                },
                '&:active .okazion-cat-circle': {
                  borderColor: OKAZION_RED,
                  bgcolor: OKAZION_RED_SOFT,
                },
              }}
            >
              <Box
                className="okazion-cat-circle"
                sx={{
                  width: { xs: 72, sm: 76 },
                  height: { xs: 72, sm: 76 },
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: active ? OKAZION_RED_SOFT : 'background.paper',
                  border: '1px solid',
                  borderColor: active ? OKAZION_RED : 'divider',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <HomeVerticalIcon verticalId={vertical.id} size={40} color={OKAZION_RED} />
              </Box>
              <Typography
                className="okazion-cat-label"
                variant="caption"
                sx={{
                  fontWeight: active ? 700 : 600,
                  color: active ? OKAZION_RED : 'text.secondary',
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.72rem', sm: '0.78rem' },
                  transition: 'color 0.15s ease',
                }}
              >
                {vertical.label}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
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
      <Stack
        direction="row"
        sx={{ mt: { xs: 1.5, md: 2 }, width: '100%', justifyContent: 'space-between' }}
      >
        {(['real-estate', 'cars', 'jobs', 'marketplace'] as const).map((id) => (
          <Stack key={id} spacing={0.45} sx={{ flex: 1, alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 72, sm: 76 },
                height: { xs: 72, sm: 76 },
                borderRadius: '50%',
                bgcolor: 'action.hover',
              }}
            />
            <Box sx={{ width: 44, height: 10, borderRadius: 1, bgcolor: 'action.hover' }} />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
