'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { useDisplayPathname } from '@/hooks/use-navigation-pending';
import { useLanguage } from '@/hooks/use-language';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_SOFT,
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  PROFILES_ACCENT,
  PROFILES_ACCENT_SOFT,
  localizeHomeBrowseCategories,
  localizeSearchCategories,
} from '@/lib/home-categories';
import { hardNavigate, hardRefreshToTop } from '@/lib/hard-navigate';
import { paths } from '@/paths';
import { MOTION } from '@/styles/motion';

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

type AccentMode = 'ai' | 'okazion' | 'profiles' | 'default';

function accentColor(mode: AccentMode): string {
  if (mode === 'ai') return AI_SEARCH_BLUE;
  if (mode === 'okazion') return OKAZION_ACCENT;
  if (mode === 'profiles') return PROFILES_ACCENT;
  return 'var(--mui-palette-primary-main)';
}

function accentSoft(mode: AccentMode): string {
  if (mode === 'ai') return AI_SEARCH_BLUE_SOFT;
  if (mode === 'okazion') return OKAZION_ACCENT_SOFT;
  if (mode === 'profiles') return PROFILES_ACCENT_SOFT;
  return 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)';
}

function accentModeFor(id: string): AccentMode {
  if (id === 'ai') return 'ai';
  if (id === 'okazion') return 'okazion';
  if (id === 'profiles') return 'profiles';
  return 'default';
}

export function HeroCategoryCircles({
  variant = 'links',
  selectedIndex: selectedIndexProp,
  onSelect,
  includeAi = true,
}: HeroCategoryCirclesProps) {
  const pathname = usePathname();
  const displayPathname = useDisplayPathname();
  const { language } = useLanguage();
  const t = useCopy();
  const heroVerticals = React.useMemo(
    () => (includeAi ? localizeSearchCategories(language) : localizeHomeBrowseCategories(language)),
    [includeAi, language],
  );

  const selectedFromPath = React.useMemo(() => {
    if (!displayPathname || displayPathname === '/') return -1;
    // /kerko manages selection via props when used as tabs; as links, never force AI.
    if (displayPathname === paths.public.search || displayPathname.startsWith(`${paths.public.search}/`)) {
      return -1;
    }
    const idx = heroVerticals.findIndex((v) => {
      if (v.id === 'ai') return false;
      const base = v.href.split('?')[0];
      return displayPathname === base || displayPathname.startsWith(`${base}/`);
    });
    return idx >= 0 ? idx : -1;
  }, [heroVerticals, displayPathname]);

  const selectedIndex =
    variant === 'tabs' && selectedIndexProp != null ? selectedIndexProp : selectedFromPath;

  /** Soft tint on hover; selected never goes solid-fill. */
  const itemSx = (mode: AccentMode) => {
    const accent = accentColor(mode);
    const soft = accentSoft(mode);
    return {
      flexShrink: 0,
      alignItems: 'center',
      flex: { md: '1 1 0' },
      width: { md: '100%' },
      minWidth: { xs: 'auto', md: 0 },
      maxWidth: { md: '100%' },
      cursor: 'pointer',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      '&:hover .hero-cat-tile': {
        borderColor: accent,
        bgcolor: soft,
      },
      '&:hover .hero-cat-label': {
        color: accent,
      },
      '&:active': {
        transform: 'scale(0.96)',
        transitionDuration: MOTION.press,
      },
      '&:active .hero-cat-tile': {
        borderColor: accent,
        bgcolor: soft,
        transitionDuration: MOTION.press,
      },
      '&:active .hero-cat-label': {
        color: accent,
      },
      transition: `transform ${MOTION.release} ${MOTION.ease}`,
    };
  };

  return (
    <Box
      component="nav"
      aria-label={t.chrome.categoriesAria}
      data-no-tab-swipe
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: { xs: 1.25, sm: 2, md: 1.5 },
        justifyContent: { xs: 'flex-start', md: 'stretch' },
        overflowX: { xs: 'auto', md: 'visible' },
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'auto',
        scrollBehavior: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        pb: { xs: 0, md: 0 },
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
            {/* Mobile: circle. Desktop: 4:3 tile matching the banner, filled with larger icon. */}
            <Box
              className="hero-cat-tile"
              sx={{
                width: { xs: 60, sm: 58, md: '100%' },
                height: { xs: 60, sm: 58, md: 'auto' },
                aspectRatio: { md: '4 / 3' },
                borderRadius: { xs: '50%', md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: { md: 1.25 },
                px: { md: 1.25 },
                py: { md: 1.5 },
                boxSizing: 'border-box',
                bgcolor: selected ? soft : 'action.hover',
                border: '1.5px solid',
                borderColor: selected ? accent : 'divider',
                transition: `border-color ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}`,
              }}
            >
              <Box
                sx={{
                  display: { xs: 'contents', md: 'grid' },
                  placeItems: 'center',
                  flex: { md: '1 1 auto' },
                  minHeight: 0,
                  width: '100%',
                  '& svg': {
                    width: { md: 48 },
                    height: { md: 48 },
                  },
                }}
              >
                <HomeVerticalIcon verticalId={v.id} size={34} color={accent} />
              </Box>
              <Typography
                className="hero-cat-label"
                variant="caption"
                sx={{
                  display: { xs: 'none', md: 'block' },
                  fontWeight: selected ? 800 : 700,
                  fontSize: { md: '0.88rem', lg: '0.95rem' },
                  color: selected ? accent : 'text.primary',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  flexShrink: 0,
                  transition: 'color 140ms ease',
                }}
              >
                {v.label}
              </Typography>
            </Box>
            <Typography
              className="hero-cat-label"
              variant="caption"
              sx={{
                display: { xs: 'block', md: 'none' },
                fontWeight: selected ? 700 : 600,
                color: selected ? accent : 'text.primary',
                whiteSpace: 'nowrap',
                textAlign: 'center',
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
              spacing={{ xs: 0.4, md: 0 }}
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
            component="a"
            href={v.href}
            spacing={{ xs: 0.4, md: 0 }}
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
