'use client';

import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

/** Same palette/texture as `HomepageBanner` variant="secondary" (community card). */
const BANNER_SURFACE_VARS = {
  brand: {
    light: {
      '--banner-base-from': '#f4faef',
      '--banner-base-to': '#eaf4dd',
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.42)',
      '--banner-orb-b': 'rgba(58, 140, 0, 0.32)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.22)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.09)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.035)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.06)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.35)',
    },
    dark: {
      '--banner-base-from': '#0f1f15',
      '--banner-base-to': '#1a2a23',
      '--banner-orb-a': 'rgba(var(--mui-palette-primary-mainChannel) / 0.32)',
      '--banner-orb-b': 'rgba(58, 140, 0, 0.28)',
      '--banner-ring': 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
      '--banner-ring-shadow-1': 'rgba(var(--mui-palette-primary-mainChannel) / 0.072)',
      '--banner-ring-shadow-2': 'rgba(var(--mui-palette-primary-mainChannel) / 0.027)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.07)',
      '--banner-eyebrow-bg': 'rgba(var(--mui-palette-primary-mainChannel) / 0.18)',
      '--banner-eyebrow-border': 'rgba(var(--mui-palette-primary-mainChannel) / 0.4)',
    },
  },
  /** Okazion — soft crimson wash (matches OKAZION_ACCENT). */
  okazion: {
    light: {
      '--banner-base-from': '#fff5f5',
      '--banner-base-to': '#ffe8e8',
      '--banner-orb-a': 'rgba(239, 68, 68, 0.4)',
      '--banner-orb-b': 'rgba(220, 38, 38, 0.3)',
      '--banner-ring': 'rgba(239, 68, 68, 0.22)',
      '--banner-ring-shadow-1': 'rgba(239, 68, 68, 0.09)',
      '--banner-ring-shadow-2': 'rgba(239, 68, 68, 0.035)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.06)',
      '--banner-eyebrow-bg': 'rgba(239, 68, 68, 0.14)',
      '--banner-eyebrow-border': 'rgba(239, 68, 68, 0.35)',
    },
    dark: {
      '--banner-base-from': '#1a0f11',
      '--banner-base-to': '#2a1518',
      '--banner-orb-a': 'rgba(239, 68, 68, 0.34)',
      '--banner-orb-b': 'rgba(220, 38, 38, 0.28)',
      '--banner-ring': 'rgba(239, 68, 68, 0.2)',
      '--banner-ring-shadow-1': 'rgba(239, 68, 68, 0.08)',
      '--banner-ring-shadow-2': 'rgba(239, 68, 68, 0.03)',
      '--banner-dot': 'rgba(var(--mui-palette-text-primaryChannel) / 0.07)',
      '--banner-eyebrow-bg': 'rgba(239, 68, 68, 0.18)',
      '--banner-eyebrow-border': 'rgba(239, 68, 68, 0.4)',
    },
  },
} as const;

export type BannerSurfaceTone = keyof typeof BANNER_SURFACE_VARS;

/**
 * Decorative card shell matching the homepage community banner —
 * gradient, soft orbs, dot grid. Used by SEO paragraph blocks sitewide.
 */
export function BannerSurface({
  children,
  dense = false,
  tone = 'brand',
  sx,
  ...rest
}: {
  children: React.ReactNode;
  dense?: boolean;
  /** `okazion` = crimson wash for Okazion SEO / promo surfaces. */
  tone?: BannerSurfaceTone;
} & Omit<BoxProps, 'children'>) {
  const vars = BANNER_SURFACE_VARS[tone];
  return (
    <Box
      {...rest}
      sx={[
        (theme) => ({
          ...vars.light,
          ...theme.applyStyles('dark', vars.dark),
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          borderRadius: { xs: 3, md: 4 },
          border: 'none',
          backgroundImage: 'linear-gradient(135deg, var(--banner-base-from) 0%, var(--banner-base-to) 100%)',
          isolation: 'isolate',
          display: 'flex',
          alignItems: 'center',
          px: dense ? { xs: 2.25, sm: 3, md: 4 } : { xs: 2.5, sm: 4, md: 6 },
          py: dense ? { xs: 2.5, md: 3.25 } : { xs: 3.5, md: 4.5 },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: -80, md: -120 },
          left: { xs: -100, md: -80 },
          width: { xs: 260, md: 380 },
          height: { xs: 260, md: 380 },
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, var(--banner-orb-a) 0%, transparent 65%)',
          opacity: 0.85,
          zIndex: 0,
          display: { xs: 'none', md: 'block' },
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: { xs: -100, md: -140 },
          right: { xs: -80, md: -90 },
          width: { xs: 280, md: 420 },
          height: { xs: 280, md: 420 },
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, var(--banner-orb-b) 0%, transparent 70%)',
          opacity: 0.8,
          zIndex: 0,
          display: { xs: 'none', md: 'block' },
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(var(--banner-dot) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%' }}>{children}</Box>
    </Box>
  );
}
