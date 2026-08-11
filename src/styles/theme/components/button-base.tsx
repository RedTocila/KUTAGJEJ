import type { Components } from '@mui/material/styles';

import { MOTION, PRESS_FEEDBACK } from '@/styles/motion';

import type { Theme } from '../types';

/**
 * Shared press behavior for every ButtonBase descendant (Button, IconButton,
 * Fab, Chip delete, ListItemButton, Tab, etc.).
 */
export const MuiButtonBase = {
  styleOverrides: {
    root: {
      WebkitTapHighlightColor: 'transparent',
      // Removes double-tap-zoom delay on mobile so clicks feel immediate.
      touchAction: 'manipulation',
      ...PRESS_FEEDBACK,
    },
  },
} satisfies Components<Theme>['MuiButtonBase'];

export const MuiFab = {
  styleOverrides: {
    root: {
      transition: `background-color ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}`,
      '&:active': {
        transform: 'scale(0.96)',
        transitionDuration: MOTION.press,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
  },
} satisfies Components<Theme>['MuiFab'];
