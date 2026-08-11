import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';

/**
 * Global interactive polish applied via CssBaseline so native buttons / links
 * feel consistent with MUI controls without per-component wiring.
 */
export const MuiCssBaseline = {
  styleOverrides: {
    'button, [role="button"], a, summary, label[for]': {
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
    },
    // Instant press for native / unstyled controls that aren't MUI ButtonBase.
    'button:not(.MuiButtonBase-root):active, [role="button"]:not(.MuiButtonBase-root):active': {
      transform: 'scale(0.98)',
      transitionDuration: '0ms',
    },
    '@media (prefers-reduced-motion: reduce)': {
      'button:not(.MuiButtonBase-root):active, [role="button"]:not(.MuiButtonBase-root):active': {
        transform: 'none',
      },
    },
  },
} satisfies Components<Theme>['MuiCssBaseline'];
