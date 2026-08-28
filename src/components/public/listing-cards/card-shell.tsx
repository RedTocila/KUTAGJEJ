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
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
  /** Borderless product-card treatment for dense two-column grids. */
  compact?: boolean;
  /** @deprecated Ignored — premium is shown via Premium Badge on media. */
  premium?: boolean;
  /** @deprecated Ignored — OKAZION is shown via the media badge / price countdown. */
  okazion?: boolean;
}) {
  return (
    <Box
      className="kutagjej-card-enter"
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: compact ? 0 : 2,
        overflow: compact ? 'visible' : 'hidden',
        bgcolor: compact ? 'transparent' : 'background.paper',
        border: compact ? 'none' : '2px solid',
        borderColor: compact ? 'transparent' : 'divider',
        boxShadow: 'none',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            borderColor: compact ? 'transparent' : 'primary.main',
            transform: 'translateY(-3px)',
            boxShadow: compact
              ? 'none'
              : (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 12px 28px rgba(0, 0, 0, 0.35)'
                    : '0 12px 28px rgba(15, 23, 10, 0.1)',
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
      }}
    >
      {mediaSlot}
      {children}
    </Box>
  );
}
