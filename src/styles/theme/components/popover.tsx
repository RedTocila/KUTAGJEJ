import type { Components } from '@mui/material/styles';

import { MenuPopTransition } from '@/components/core/pop-transition';

import type { Theme } from '../types';

export const MuiPopover = {
  defaultProps: {
    slots: { transition: MenuPopTransition },
  },
} satisfies Components<Theme>['MuiPopover'];

/** `Menu` forwards its own `slots.transition` to Popover, so it needs the default too. */
export const MuiMenu = {
  defaultProps: {
    slots: { transition: MenuPopTransition },
  },
} satisfies Components<Theme>['MuiMenu'];
