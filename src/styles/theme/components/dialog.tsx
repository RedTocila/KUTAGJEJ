import type { Components } from '@mui/material/styles';

import { MOTION_DIALOG_MS } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiDialog = {
  defaultProps: {
    transitionDuration: MOTION_DIALOG_MS,
  },
} satisfies Components<Theme>['MuiDialog'];
