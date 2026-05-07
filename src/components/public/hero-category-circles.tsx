'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { alpha, Box, Stack, Typography } from '@mui/material';

import { HOME_VERTICALS } from '@/lib/home-categories';

import { VerticalIcon } from './vertical-icon';

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
        maxWidth: 920,
        mx: 'auto',
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
          justifyContent: { xs: 'flex-start', sm: 'center' },
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: { xs: 'x proximity', sm: 'none' },
          scrollbarGutter: 'stable',
          pb: 0.75,
          mx: { xs: -1, sm: 0 },
          px: { xs: 1, sm: 0 },
          '&::-webkit-scrollbar': { height: 5 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 2.5,
            bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.18),
          },
        }}
      >
        {heroVerticals.map((v, i) => {
          const selected = selectedIndex >= 0 && i === selectedIndex;
          const body = (
            <>
              <Box
                sx={{
                  width: { xs: 56, sm: 64 },
                  height: { xs: 56, sm: 64 },
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'transparent',
                }}
              >
                <VerticalIcon
                  verticalId={v.id}
                  size={64}
                  decorative
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scale(1.32)',
                  }}
                />
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
