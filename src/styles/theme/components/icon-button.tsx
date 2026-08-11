import type { Components } from '@mui/material/styles';

import { PRESS_FEEDBACK } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiIconButton = {
  styleOverrides: {
    root: {
      ...PRESS_FEEDBACK,
      '&:active': {
        ...PRESS_FEEDBACK['&:active'],
        transform: 'scale(0.92)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
  },
} satisfies Components<Theme>['MuiIconButton'];
