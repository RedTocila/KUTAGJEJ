import type { Components } from '@mui/material/styles';

import { DialogPopTransition } from '@/components/core/pop-transition';
import { MOTION_DIALOG_MS } from '@/styles/motion';

import type { Theme } from '../types';

export const MuiDialog = {
  defaultProps: {
    transitionDuration: MOTION_DIALOG_MS,
    slots: { transition: DialogPopTransition },
  },
} satisfies Components<Theme>['MuiDialog'];
