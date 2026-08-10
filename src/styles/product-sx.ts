import type { Theme } from '@mui/material/styles';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { MOTION } from '@/styles/motion';

/** Bordered paper panel — portal cards, listing detail sections, dialogs. */
export const productPanelSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  overflow: 'hidden',
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
  border: '1px solid',
  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'divider',
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
