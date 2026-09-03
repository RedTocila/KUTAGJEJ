import type { Theme } from '@mui/material/styles';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { MOTION } from '@/styles/motion';

/** Light-mode elevated panel fill (pure white on sage page). */
export const PANEL_BG_LIGHT = '#ffffff';
/** Dark-mode elevated panel — relies on CssVars `.dark` class, not `palette.mode`. */
export const PANEL_BG_DARK = 'var(--mui-palette-background-level1)';
export const PANEL_SHADOW_LIGHT = '0 2px 4px rgba(15, 23, 10, 0.05), 0 10px 28px rgba(15, 23, 10, 0.12)';
export const PANEL_SHADOW_DARK = '0 8px 28px rgba(0,0,0,0.55)';
export const PANEL_SHADOW_LIGHT_HOVER = '0 4px 8px rgba(15, 23, 10, 0.06), 0 14px 32px rgba(15, 23, 10, 0.16)';
export const PANEL_SHADOW_DARK_HOVER = '0 14px 32px rgba(0,0,0,0.55)';

/**
 * Borderless elevated panel.
 * Use `.dark &` (colorSchemeSelector: class) — `theme.palette.mode` stays on the
 * default scheme under CssVars and would leave cards white in dark mode.
 */
export const productPanelSx = {
  borderRadius: 3,
  border: 'none',
  overflow: 'hidden',
  bgcolor: PANEL_BG_LIGHT,
  boxShadow: PANEL_SHADOW_LIGHT,
  '.dark &': {
    bgcolor: PANEL_BG_DARK,
    boxShadow: PANEL_SHADOW_DARK,
  },
} as const;

/** Shared outlined field chrome — forms, filters, reservation, dialogs. */
export const productFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    bgcolor: 'background.paper',
    transition: `box-shadow ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}`,
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${primaryMainAlpha(0.12)}`,
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 600,
  },
} as const;

/** Primary CTA button chrome (not pills — reserve 999 for chips / sticky bar). */
export const productButtonSx = {
  textTransform: 'none' as const,
  fontWeight: 800,
  borderRadius: 2.25,
  boxShadow: 'none',
  transition: `background-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}`,
  '&:hover': { boxShadow: 'none' },
  '&:active': { transform: 'scale(0.98)' },
};

/** Shared black paper surface for dark-mode menus / dialogs. */
export const productSurfacePaperSx = (theme: Theme) => ({
  borderRadius: 3,
  border: 'none',
  bgcolor: theme.palette.mode === 'dark' ? '#0c0c0c' : 'background.paper',
  backgroundImage: 'none',
  color: 'text.primary',
  overflow: 'hidden',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 24px 80px rgba(0, 0, 0, 0.55)'
      : '0 20px 56px rgba(15, 23, 10, 0.16)',
});

/** Dialog paper — follows light/dark color scheme. */
export const productDialogPaperSx = (theme: Theme) => ({
  ...productSurfacePaperSx(theme),
  mx: 2,
});

/** Popover / account menu paper — same black surface as product dialogs. */
export const productPopoverPaperSx = (theme: Theme) => productSurfacePaperSx(theme);

const productDialogBackdropSx = (theme: Theme) => ({
  bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 10, 0.42)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
});

/** Shared Dialog `slotProps` for product modals. */
export const productDialogSlotProps = {
  backdrop: {
    sx: productDialogBackdropSx,
  },
  paper: {
    elevation: 0 as const,
    sx: productDialogPaperSx,
  },
};

export const productDialogTitleSx = {
  position: 'relative',
  px: 2.5,
  pt: 2.25,
  pb: 1,
  pr: 6,
  fontWeight: 800,
  fontSize: '1.125rem',
  letterSpacing: '-0.01em',
  color: 'text.primary',
} as const;

export const productDialogCloseButtonSx = {
  position: 'absolute',
  right: 12,
  top: 12,
  color: 'text.secondary',
  borderRadius: 2,
  transition: `color ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.fast} ${MOTION.ease}`,
  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
  '&:active': { transform: 'scale(0.94)' },
} as const;

export const productDialogContentSx = {
  px: 2.5,
  pb: 1.5,
  pt: '8px !important',
  color: 'text.primary',
} as const;

export const productDialogActionsSx = {
  px: 2.5,
  pb: 2.5,
  pt: 1,
  gap: 1,
} as const;
