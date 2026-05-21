'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

import { HOME_VERTICALS, type HomeVerticalId } from '@/lib/home-categories';

const HERO_CATEGORY_ICON_SRC: Record<HomeVerticalId, string> = {
  'real-estate': '/house.svg',
  cars: '/car.svg',
  jobs: '/suitcase.svg',
  marketplace: '/shopping-cart.svg',
  businesses: '/margarita.svg',
  professionals: '/people.svg',
};

function HeroCategoryIcon({ verticalId }: { verticalId: HomeVerticalId }) {
  const src = HERO_CATEGORY_ICON_SRC[verticalId];

  return (
    <Box
      aria-hidden
      sx={{
        width: { xs: 26, sm: 28 },
        height: { xs: 26, sm: 28 },
        flexShrink: 0,
        bgcolor: 'primary.main',
        mask: `url(${src}) no-repeat center / contain`,
        WebkitMask: `url(${src}) no-repeat center / contain`,
      }}
    />
  );
}

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
  const heroVerticals = React.useMemo(() => HOME_VERTICALS, []);

  const selectedFromPath = React.useMemo(() => {
    if (!pathname || pathname === '/') return -1;
    const idx = heroVerticals.findIndex(
      (v) => pathname === v.href || pathname?.startsWith(`${v.href}/`),
    );
    return idx >= 0 ? idx : -1;
  }, [heroVerticals, pathname]);

  const selectedIndex =
    variant === 'tabs' && selectedIndexProp != null ? selectedIndexProp : selectedFromPath;

  const itemSx = {
    flexShrink: 0,
    scrollSnapAlign: { xs: 'start', sm: 'none' } as const,
    alignItems: 'center',
  };

  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      <Box
        component="nav"
        aria-label="Kategoritë kryesore"
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
          scrollbarWidth: { xs: 'none', sm: 'auto' },
          pb: { xs: 0, sm: 0.75 },
          '&::-webkit-scrollbar': {
            display: { xs: 'none', sm: 'block' },
            height: { sm: 5 },
          },
          '&::-webkit-scrollbar-thumb': {
            display: { xs: 'none', sm: 'block' },
            borderRadius: 2.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(26, 33, 24, 0.18)',
          },
        }}
      >
        {heroVerticals.map((v, i) => {
          const selected = selectedIndex >= 0 && i === selectedIndex;
          const body = (
            <>
              <Box
                sx={{
                  width: { xs: 52, sm: 58 },
                  height: { xs: 52, sm: 58 },
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <HeroCategoryIcon verticalId={v.id} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: selected ? 700 : 600,
                  color: selected ? 'primary.main' : 'text.secondary',
                  whiteSpace: 'nowrap',
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
                sx={{
                  ...itemSx,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
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
              sx={{
                ...itemSx,
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                userSelect: 'none',
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
