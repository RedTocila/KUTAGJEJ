'use client';

import * as React from 'react';
import { Box } from '@mui/material';

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
        transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
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
