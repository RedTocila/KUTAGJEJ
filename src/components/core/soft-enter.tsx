'use client';

import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

/**
 * Short enter animation on mount. Remount (e.g. `key={pathname}`) to replay on
 * route changes. Respects `prefers-reduced-motion` via global CSS.
 * Default is fade-only — pass `className="kutagjej-enter"` for a soft rise.
 */
export function SoftEnter({
  children,
  className = 'kutagjej-fade',
  ...rest
}: BoxProps) {
  return (
    <Box className={className} {...rest}>
      {children}
    </Box>
  );
}
