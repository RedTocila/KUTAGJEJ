import type { Components } from '@mui/material/styles';

import { DESKTOP_CONTENT_MAX_WIDTH_PX } from '@/lib/desktop-content-width';

import type { Theme } from '../types';

/**
 * MUI's default `maxWidth="xl"` only kicks in at `breakpoints.up('xl')` (1440px),
 * so laptops stay fluid — we cap earlier and keep lg/xl aligned.
 */
export const MuiContainer = {
  styleOverrides: {
    maxWidthXl: ({ theme }) => ({
      maxWidth: DESKTOP_CONTENT_MAX_WIDTH_PX,
      [theme.breakpoints.up('xl')]: {
        maxWidth: DESKTOP_CONTENT_MAX_WIDTH_PX,
      },
    }),
    maxWidthLg: ({ theme }) => ({
      maxWidth: DESKTOP_CONTENT_MAX_WIDTH_PX,
      [theme.breakpoints.up('lg')]: {
        maxWidth: DESKTOP_CONTENT_MAX_WIDTH_PX,
      },
    }),
  },
} satisfies Components<Theme>['MuiContainer'];
