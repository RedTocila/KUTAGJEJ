import type { Components } from '@mui/material/styles';

import { PANEL_BG_LIGHT } from '@/styles/product-sx';

import type { Theme } from '../types';

/** Bottom / side sheets — white in light mode (not sage `background.paper`). */
export const MuiDrawer = {
  styleOverrides: {
    paper: {
      backgroundImage: 'none',
      backgroundColor: PANEL_BG_LIGHT,
      '.dark &': {
        backgroundColor: 'var(--mui-palette-background-paper)',
      },
    },
  },
} satisfies Components<Theme>['MuiDrawer'];
