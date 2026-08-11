import type { Components } from '@mui/material/styles';

import { MOTION, PRESS_FEEDBACK } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiButton = {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    root: {
      borderRadius: '12px',
      textTransform: 'none',
      ...PRESS_FEEDBACK,
      '&:active': {
        ...PRESS_FEEDBACK['&:active'],
        transform: 'scale(0.98)',
      },
      '&.MuiButton-text.MuiButton-sizeSmall': { padding: '7px 12px' },
      '&.MuiButton-text.MuiButton-sizeMedium': { padding: '9px 16px' },
      '&.MuiButton-text.MuiButton-sizeLarge': { padding: '12px 16px' },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
    sizeSmall: { padding: '6px 16px' },
    sizeMedium: { padding: '8px 20px' },
    sizeLarge: { padding: '11px 24px' },
    // Contained presses also darken slightly for clearer feedback.
    contained: {
      '&:active': {
        filter: 'brightness(0.94)',
        transitionDuration: MOTION.press,
      },
    },
  },
} satisfies Components<Theme>['MuiButton'];
