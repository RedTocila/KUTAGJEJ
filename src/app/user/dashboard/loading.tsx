import * as React from 'react';
import { Box, CircularProgress } from '@mui/material';

/**
 * Instant feedback while soft-navigating between dashboard pages.
 * Keeps the shell (side nav / bottom nav) mounted via the parent layout.
 */
export default function Loading(): React.JSX.Element {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 240,
        py: 6,
      }}
    >
      <CircularProgress size={28} />
    </Box>
  );
}
