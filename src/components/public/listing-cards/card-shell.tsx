'use client';

import * as React from 'react';
import { Box } from '@mui/material';

/**
 * Shared chrome for the public listing cards: a quiet bordered card that
 * lifts subtly and tints its border on hover. Optional `mediaSlot` for
 * verticals that have real photos (e.g. cars).
 */
export function CardShell({
  children,
  mediaSlot,
}: {
  children: React.ReactNode;
  mediaSlot?: React.ReactNode;
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
        border: '1px solid',
        borderColor: 'divider',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
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
