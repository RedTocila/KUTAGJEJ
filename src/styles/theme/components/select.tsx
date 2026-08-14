import type { Components } from '@mui/material/styles';
import type { Theme as MuiTheme } from '@mui/material/styles';

import { productSurfacePaperSx } from '@/styles/product-sx';

import type { Theme } from '../types';

/** Open under the field (not over it) — matches SearchableSelect / native popovers. */
const selectMenuProps = {
  anchorOrigin: { vertical: 'bottom' as const, horizontal: 'left' as const },
  transformOrigin: { vertical: 'top' as const, horizontal: 'left' as const },
  /** Avoid aligning the selected item over the trigger (default `selectedMenu` behavior). */
  variant: 'menu' as const,
  MenuListProps: { autoFocusItem: false },
  slotProps: {
    paper: {
      elevation: 0,
      sx: (theme: MuiTheme) => ({
        ...productSurfacePaperSx(theme),
        mt: 0.5,
        maxHeight: 320,
        borderRadius: 2.5,
      }),
    },
  },
};

export const MuiSelect = {
  defaultProps: {
    MenuProps: selectMenuProps,
  },
} satisfies Components<Theme>['MuiSelect'];

export const MuiMenuItem = {
  styleOverrides: {
    root: {
      fontSize: '0.875rem',
      fontWeight: 500,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
      '&.Mui-selected': {
        fontWeight: 600,
      },
    },
  },
} satisfies Components<Theme>['MuiMenuItem'];
