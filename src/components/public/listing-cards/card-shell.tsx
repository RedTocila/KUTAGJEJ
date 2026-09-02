'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { MOTION } from '@/styles/motion';

/**
 * Shared chrome for the public listing cards: a quiet bordered card that
 * lifts subtly and tints its border on hover. Premium / OKAZION are marked
 * on media (premium badge / OKAZION chip), not via card frame.
 */
export function CardShell({
  children,
  mediaSlot,
  compact = false,
  bare = false,
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
  /** Borderless product-card treatment for dense two-column grids. */
  compact?: boolean;
  /** Transparent chrome — outer wrapper supplies surface/border (job cards). */
  bare?: boolean;
  /** @deprecated Ignored — premium is shown via Premium Badge on media. */
  premium?: boolean;
  /** @deprecated Ignored — OKAZION is shown via the media badge / price countdown. */
  okazion?: boolean;
}) {
  const frameless = compact || bare;
  return (
    <Box
      className="kutagjej-card-enter"
      sx={(theme) => ({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: compact ? 0 : 2,
        overflow: compact ? 'visible' : 'hidden',
        backgroundColor: frameless ? 'transparent' : 'background.paper',
        ...theme.applyStyles('dark', {
          backgroundColor: frameless ? 'transparent' : 'var(--mui-palette-background-paper)',
        }),
        border: frameless ? 'none' : '1px solid',
        borderColor: frameless ? 'transparent' : 'divider',
        boxShadow: frameless
          ? 'none'
          : theme.palette.mode === 'dark'
            ? '0 14px 32px rgba(0, 0, 0, 0.42)'
            : 'none',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': {
              borderColor: frameless ? 'transparent' : 'primary.main',
              transform: bare ? 'none' : 'translateY(-3px)',
              boxShadow: frameless
                ? 'none'
                : theme.palette.mode === 'dark'
                  ? '0 18px 38px rgba(0, 0, 0, 0.5)'
                  : 'none',
            '& .listing-card-media-image': {
              transform: compact ? 'none' : 'scale(1.045)',
            },
          },
        },
        '&:active': {
          transform: 'scale(0.985)',
          boxShadow: 'none',
          transitionDuration: MOTION.press,
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          animation: 'none',
          '&:hover': { transform: 'none', boxShadow: 'none' },
          '&:active': { transform: 'none' },
          '&:hover .listing-card-media-image': { transform: 'none' },
        },
        '& > .listing-card-body': { flex: 1, minHeight: 0 },
      })}
    >
      {mediaSlot}
      {children}
    </Box>
  );
}
