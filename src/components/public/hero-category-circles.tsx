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
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  localizeHomeBrowseCategories,
  localizeSearchCategories,
} from '@/lib/home-categories';
import { hardNavigate, hardRefreshToTop } from '@/lib/hard-navigate';
import { paths } from '@/paths';

import { HomeVerticalIcon } from './home-vertical-icon';

export type HeroCategoryCirclesVariant = 'links' | 'tabs';

export interface HeroCategoryCirclesProps {
  variant?: HeroCategoryCirclesVariant;
  /** Used when `variant="tabs"` (e.g. HeroSearch / search page). */
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  /**
   * When false, omit AI Search (home hero / category strip).
   * Search page keeps the default `true`.
   */
  includeAi?: boolean;
}

type AccentMode = 'ai' | 'okazion' | 'default';

function accentColor(mode: AccentMode): string {
  if (mode === 'ai') return AI_SEARCH_BLUE;
  if (mode === 'okazion') return OKAZION_ACCENT;
  return 'var(--mui-palette-primary-main)';
}

function accentSoft(mode: AccentMode): string {
  if (mode === 'ai') return AI_SEARCH_BLUE_SOFT;
  if (mode === 'okazion') return OKAZION_ACCENT_SOFT;
  return 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)';
}

function accentModeFor(id: string): AccentMode {
  if (id === 'ai') return 'ai';
  if (id === 'okazion') return 'okazion';
  return 'default';
}

export function HeroCategoryCircles({
  variant = 'links',
  selectedIndex: selectedIndexProp,
  onSelect,
  includeAi = true,
}: HeroCategoryCirclesProps) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = useCopy();
  const heroVerticals = React.useMemo(
    () => (includeAi ? localizeSearchCategories(language) : localizeHomeBrowseCategories(language)),
    [includeAi, language],
  );

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

  /** Soft tint on hover; selected never goes solid-fill. */
  const itemSx = (mode: AccentMode) => {
    const accent = accentColor(mode);
    const soft = accentSoft(mode);
    return {
      flexShrink: 0,
      scrollSnapAlign: { xs: 'start', sm: 'none' } as const,
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      '&:hover .hero-cat-circle': {
        borderColor: accent,
        bgcolor: soft,
      },
      '&:hover .hero-cat-label': {
        color: accent,
      },
      '&:active .hero-cat-circle': {
        borderColor: accent,
        bgcolor: soft,
      },
      '&:active .hero-cat-label': {
        color: accent,
      },
    };
  };

  return (
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
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: { xs: 'x proximity', sm: 'none' },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        pb: { xs: 0, sm: 0.75 },
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {heroVerticals.map((v, i) => {
        const selected = selectedIndex >= 0 && i === selectedIndex;
        const mode = accentModeFor(v.id);
        const accent = accentColor(mode);
        const soft = accentSoft(mode);
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
                bgcolor: selected ? soft : 'action.hover',
                border: '1.5px solid',
                borderColor: selected ? accent : 'divider',
                transition:
                  'border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 160ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <HomeVerticalIcon verticalId={v.id} size={34} color={accent} />
            </Box>
            <Typography
              className="hero-cat-label"
              variant="caption"
              sx={{
                fontWeight: selected ? 700 : 600,
                color: selected ? accent : 'text.primary',
                whiteSpace: 'nowrap',
                transition: 'color 140ms ease',
              }}
            >
              {v.label}
            </Typography>
          </>
        );

        if (variant === 'tabs') {
          return (
            <Stack
              key={v.id}
              spacing={0.4}
              onClick={() => onSelect?.(i)}
              sx={itemSx(mode)}
            >
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
            onClick={(event) => {
              if (!selected) return;
              const base = v.href.split('?')[0];
              if (pathname === base) {
                hardRefreshToTop(event);
                return;
              }
              if (pathname?.startsWith(`${base}/`)) {
                hardNavigate(v.href, event);
              }
            }}
            sx={{
              ...itemSx(mode),
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            {body}
          </Stack>
        );
      })}
    </Box>
  );
}
