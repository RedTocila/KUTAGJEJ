'use client';

import * as React from 'react';
import { Box } from '@mui/material';

/**
 * Shared chrome for the public listing cards: a quiet bordered card that
 * lifts subtly and tints its border on hover. Premium listings get a lasting
 * amber frame while their boost window is active.
 */
export function CardShell({
  children,
  mediaSlot,
  premium = false,
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
  /** Active Premium listing — amber frame that keeps visual priority. */
  premium?: boolean;
}) {
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
        borderColor: premium ? 'warning.main' : 'divider',
        boxShadow: premium
          ? (t) =>
              t.palette.mode === 'dark'
                ? '0 0 0 1px rgba(245, 166, 35, 0.35), 0 8px 22px rgba(245, 166, 35, 0.12)'
                : '0 0 0 1px rgba(245, 166, 35, 0.28), 0 8px 20px rgba(245, 166, 35, 0.14)'
          : 'none',
        transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: premium ? 'warning.dark' : 'primary.main',
          transform: 'translateY(-2px)',
        },
        // Inner content Stack fills remaining space below the media slot.
        '& > .listing-card-body': { flex: 1, minHeight: 0 },
      }}
    >
      {mediaSlot}
      {children}
    </Box>
  );
}
