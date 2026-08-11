import type { Components } from '@mui/material/styles';

import { MOTION, PRESS_FEEDBACK } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiChip = {
  styleOverrides: {
    root: {
      ...PRESS_FEEDBACK,
      '&:active': {
        ...PRESS_FEEDBACK['&:active'],
        transform: 'scale(0.96)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
    clickable: {
      '&:active': {
        transform: 'scale(0.96)',
        transitionDuration: MOTION.press,
      },
    },
  },
} satisfies Components<Theme>['MuiChip'];
