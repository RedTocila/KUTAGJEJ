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

/** Dialog paper surface — light paper, not immersive black. */
export const productDialogPaperSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  backgroundImage: 'none',
  overflow: 'hidden',
  mx: 2,
} as const;

const productDialogBackdropSx = {
  bgcolor: 'rgba(0, 0, 0, 0.62)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
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
