import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';

export const MuiButton = {
  styleOverrides: {
    root: {
      borderRadius: '12px',
      textTransform: 'none',
      '&.MuiButton-text.MuiButton-sizeSmall': { padding: '7px 12px' },
      '&.MuiButton-text.MuiButton-sizeMedium': { padding: '9px 16px' },
      '&.MuiButton-text.MuiButton-sizeLarge': { padding: '12px 16px' },
    },
    sizeSmall: { padding: '6px 16px' },
    sizeMedium: { padding: '8px 20px' },
    sizeLarge: { padding: '11px 24px' },
  },
} satisfies Components<Theme>['MuiButton'];
