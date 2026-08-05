'use client';

import * as React from 'react';
import { Box } from '@mui/material';

/**
 * Shared chrome for the public listing cards: a quiet bordered card that
 * lifts subtly and tints its border on hover. Premium keeps an amber frame;
 * OKAZION is marked via badge/countdown only (no red card border).
 */
export function CardShell({
  children,
  mediaSlot,
  premium = false,
  okazion = false,
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
  /** Active Premium listing — amber frame that keeps visual priority. */
  premium?: boolean;
  /** Active OKAZION listing — badge + countdown on media (no red frame). */
  okazion?: boolean;
}) {
  // OKAZION uses badge/timer only; amber Premium frame only when not OKAZION.
  const premiumFrame = premium && !okazion;
  const borderColor = premiumFrame ? 'warning.main' : 'divider';
  const hoverBorder = premiumFrame ? 'warning.dark' : 'primary.main';

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '2px solid',
        borderColor,
        boxShadow: premiumFrame
          ? (t) =>
              t.palette.mode === 'dark'
                ? '0 0 0 1px rgba(245, 166, 35, 0.35), 0 8px 22px rgba(245, 166, 35, 0.12)'
                : '0 0 0 1px rgba(245, 166, 35, 0.28), 0 8px 20px rgba(245, 166, 35, 0.14)'
          : 'none',
        transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: hoverBorder,
          transform: 'translateY(-2px)',
        },
        '& > .listing-card-body': { flex: 1, minHeight: 0 },
      }}
    >
      {mediaSlot}
      {children}
    </Box>
  );
}
