import { primaryMainAlpha } from '@/lib/css-var-alpha';

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
    transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
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
  '&:hover': { boxShadow: 'none' },
};

/** Dialog paper surface — immersive black panel. */
export const productDialogPaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  bgcolor: '#0c0c0c',
  backgroundImage: 'none',
  color: '#fff',
  overflow: 'hidden',
  mx: 2,
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.55)',
} as const;

const productDialogBackdropSx = {
  bgcolor: 'rgba(0, 0, 0, 0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
} as const;

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
} as const;

export const productDialogCloseButtonSx = {
  position: 'absolute',
  right: 12,
  top: 12,
  color: 'rgba(255, 255, 255, 0.55)',
  borderRadius: 2,
  '&:hover': { color: '#fff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
} as const;

export const productDialogContentSx = {
  px: 2.5,
  pb: 1.5,
  pt: '8px !important',
} as const;

export const productDialogActionsSx = {
  px: 2.5,
  pb: 2.5,
  pt: 1,
  gap: 1,
} as const;
