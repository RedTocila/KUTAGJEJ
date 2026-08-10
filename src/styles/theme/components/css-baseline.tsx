import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';

/**
 * Global interactive polish applied via CssBaseline so native buttons / links
 * feel consistent with MUI controls without per-component wiring.
 */
export const MuiCssBaseline = {
  styleOverrides: {
    'button, [role="button"], a, summary': {
      WebkitTapHighlightColor: 'transparent',
    },
  },
} satisfies Components<Theme>['MuiCssBaseline'];
