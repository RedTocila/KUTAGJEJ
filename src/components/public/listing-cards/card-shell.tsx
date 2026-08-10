'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { MOTION } from '@/styles/motion';

/**
 * Shared chrome for the public listing cards: a quiet bordered card that
 * lifts subtly and tints its border on hover. Premium / OKAZION are marked
 * on media (crown / badge / countdown), not via card frame.
 */
export function CardShell({
  children,
  mediaSlot,
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
  /** @deprecated Ignored — premium is shown via crown on media. */
  premium?: boolean;
  /** @deprecated Ignored — OKAZION is shown via badge / countdown on media. */
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
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-3px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 12px 28px rgba(0, 0, 0, 0.35)'
                : '0 12px 28px rgba(15, 23, 10, 0.1)',
            '& .listing-card-media-image': {
              transform: 'scale(1.045)',
            },
          },
        },
        '&:active': {
          transform: 'translateY(-1px)',
          boxShadow: 'none',
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
