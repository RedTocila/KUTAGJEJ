'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

import type { HomeVerticalId } from '@/lib/home-categories';

/** Source paths for the four brand category icons (live in `public/`). */
export const VERTICAL_ICON_SRC: Record<HomeVerticalId, string> = {
  'real-estate': '/real-estate-icon.png',
  cars: '/cars-icon.png',
  jobs: '/jobs-icon.png',
  marketplace: '/market-icon.png',
};

/** Albanian alt text — used for accessibility and SEO. */
export const VERTICAL_ICON_ALT: Record<HomeVerticalId, string> = {
  'real-estate': 'Pasuri të paluajtshme',
  cars: 'Automjete',
  jobs: 'Punë',
  marketplace: 'Tregu',
};

export interface VerticalIconProps {
  verticalId: HomeVerticalId;
  /** Pixel size for both width and height (icons render in a square). */
  size?: number;
  /** Override alt text — defaults to the Albanian category label. */
  alt?: string;
  /** Optional sx for the wrapping Box (margins, borders, etc.). */
  sx?: SxProps<Theme>;
  /**
   * When `true`, the alt becomes empty (purely decorative). Use this when the
   * icon sits next to a text label that already announces the category.
   */
  decorative?: boolean;
}

/**
 * Renders the brand PNG icon for one of the four homepage verticals
 * (real-estate, cars, jobs, marketplace). Lives in `public/` so it ships as
 * a plain static asset — no `next/image` remote-patterns config required.
 *
 * Always renders a square: pass `size` for both width and height.
 */
export function VerticalIcon({ verticalId, size = 24, alt, sx, decorative = false }: VerticalIconProps) {
  return (
    <Box
      component="img"
      src={VERTICAL_ICON_SRC[verticalId]}
      alt={decorative ? '' : (alt ?? VERTICAL_ICON_ALT[verticalId])}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      sx={{
        display: 'block',
        objectFit: 'contain',
        flexShrink: 0,
        userSelect: 'none',
        ...sx,
      }}
    />
  );
}
