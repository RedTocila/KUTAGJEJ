import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';

export const MuiRating = {
  styleOverrides: {
    iconFilled: {
      color: 'var(--mui-palette-warning-main)',
    },
    iconHover: {
      color: 'var(--mui-palette-warning-main)',
    },
  },
} satisfies Components<Theme>['MuiRating'];
