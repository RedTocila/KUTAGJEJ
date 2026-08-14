import type { Components } from '@mui/material/styles';

import type { Theme } from '../types';
import { MuiAvatar } from './avatar';
import { MuiButton } from './button';
import { MuiButtonBase, MuiFab } from './button-base';
import { MuiCard } from './card';
import { MuiCardContent } from './card-content';
import { MuiCardHeader } from './card-header';
import { MuiChip } from './chip';
import { MuiCssBaseline } from './css-baseline';
import { MuiDialog } from './dialog';
import { MuiIconButton } from './icon-button';
import { MuiLink } from './link';
import { MuiRating } from './rating';
import { MuiMenuItem, MuiSelect } from './select';
import { MuiStack } from './stack';
import { MuiTab } from './tab';
import { MuiTableBody } from './table-body';
import { MuiTableCell } from './table-cell';
import { MuiTableHead } from './table-head';

export const components = {
  MuiAvatar,
  MuiButton,
  MuiButtonBase,
  MuiCard,
  MuiCardContent,
  MuiCardHeader,
  MuiChip,
  MuiCssBaseline,
  MuiDialog,
  MuiFab,
  MuiIconButton,
  MuiLink,
  MuiMenuItem,
  MuiRating,
  MuiSelect,
  MuiStack,
  MuiTab,
  MuiTableBody,
  MuiTableCell,
  MuiTableHead,
} satisfies Components<Theme>;
