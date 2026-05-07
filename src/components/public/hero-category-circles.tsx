'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, Stack, Typography } from '@mui/material';

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

  return (
    <Stack
      direction="row"
      spacing={{ xs: 1.25, sm: 2 }}
      sx={{
        justifyContent: 'center',
        flexWrap: 'wrap',
        rowGap: 1.25,
        width: '100%',
        maxWidth: 920,
        mx: 'auto',
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
              sx={{ alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
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
              alignItems: 'center',
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
    </Stack>
  );
}
