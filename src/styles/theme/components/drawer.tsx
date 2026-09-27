import type { Components } from '@mui/material/styles';

import { MOTION, MOTION_SHEET_MS } from '@/styles/motion';
import { PANEL_BG_LIGHT } from '@/styles/product-sx';

import type { Theme } from '../types';

/** Bottom / side sheets — white in light mode (not sage `background.paper`). */
export const MuiDrawer = {
  defaultProps: {
    transitionDuration: MOTION_SHEET_MS,
    slotProps: {
      transition: { easing: { enter: MOTION.easeIos, exit: MOTION.easeExit } },
    },
  },
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
