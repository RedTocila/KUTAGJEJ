'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_SOFT,
  localizeSearchCategories,
} from '@/lib/home-categories';
import { paths } from '@/paths';

import { HomeVerticalIcon } from './home-vertical-icon';

export type HeroCategoryCirclesVariant = 'links' | 'tabs';

export interface HeroCategoryCirclesProps {
  variant?: HeroCategoryCirclesVariant;
  /** Used when `variant="tabs"` (e.g. HeroSearch). */
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export function HeroCategoryCircles({
  variant = 'links',
  selectedIndex: selectedIndexProp,
  onSelect,
}: HeroCategoryCirclesProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = useCopy();
  const heroVerticals = React.useMemo(() => localizeSearchCategories(language), [language]);

  const selectedFromPath = React.useMemo(() => {
    if (!pathname || pathname === '/') return -1;
    // /kerko manages selection via props when used as tabs; as links, never force AI.
    if (pathname === paths.public.search || pathname?.startsWith(`${paths.public.search}/`)) {
      return -1;
    }
    const idx = heroVerticals.findIndex((v) => {
      if (v.id === 'ai') return false;
      const base = v.href.split('?')[0];
      return pathname === base || pathname?.startsWith(`${base}/`);
    });
    return idx >= 0 ? idx : -1;
  }, [heroVerticals, pathname]);

  const selectedIndex =
    variant === 'tabs' && selectedIndexProp != null ? selectedIndexProp : selectedFromPath;

  const itemSx = (isAi: boolean) => ({
    flexShrink: 0,
    scrollSnapAlign: { xs: 'start', sm: 'none' } as const,
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    '&:hover .hero-cat-circle': {
      borderColor: isAi ? AI_SEARCH_BLUE : 'primary.main',
      bgcolor: isAi
        ? AI_SEARCH_BLUE_SOFT
        : (theme: { palette: { mode: string } }) =>
            theme.palette.mode === 'dark'
              ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)'
              : 'rgba(var(--mui-palette-primary-mainChannel) / 0.12)',
    },
    '&:hover .hero-cat-label': {
      color: isAi ? AI_SEARCH_BLUE : 'primary.main',
    },
    '&:active .hero-cat-circle': {
      borderColor: isAi ? AI_SEARCH_BLUE : 'primary.main',
      bgcolor: isAi
        ? AI_SEARCH_BLUE_SOFT
        : (theme: { palette: { mode: string } }) =>
            theme.palette.mode === 'dark'
              ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.28)'
              : 'rgba(var(--mui-palette-primary-mainChannel) / 0.2)',
    },
    '&:active .hero-cat-label': {
      color: isAi ? AI_SEARCH_BLUE : 'primary.main',
    },
  });

  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      <Box
        component="nav"
        aria-label={t.chrome.categoriesAria}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          gap: { xs: 1.25, sm: 2 },
          justifyContent: 'flex-start',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: { xs: 'x proximity', sm: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          pb: { xs: 0, sm: 0.75 },
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {heroVerticals.map((v, i) => {
          const selected = selectedIndex >= 0 && i === selectedIndex;
          const isAi = v.id === 'ai';
          const accent = isAi ? AI_SEARCH_BLUE : 'primary.main';
          const body = (
            <>
              <Box
                className="hero-cat-circle"
                sx={{
                  width: { xs: 60, sm: 58 },
                  height: { xs: 60, sm: 58 },
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: selected
                    ? isAi
                      ? AI_SEARCH_BLUE_SOFT
                      : (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.22)'
                            : 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)'
                    : 'background.paper',
                  border: '1px solid',
                  borderColor: isAi ? AI_SEARCH_BLUE : selected ? accent : 'divider',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <HomeVerticalIcon verticalId={v.id} size={34} />
              </Box>
              <Typography
                className="hero-cat-label"
                variant="caption"
                sx={{
                  fontWeight: selected ? 700 : 600,
                  color: selected ? accent : 'text.secondary',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                }}
              >
                {v.label}
              </Typography>
            </>
          );

          if (variant === 'tabs') {
            return (
              <Stack key={v.id} spacing={0.4} onClick={() => onSelect?.(i)} sx={itemSx(isAi)}>
                {body}
              </Stack>
            );
          }

          return (
            <Stack
              key={v.id}
              component={RouterLink}
              href={v.href}
              spacing={0.4}
              sx={{
                ...itemSx(isAi),
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              {body}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
