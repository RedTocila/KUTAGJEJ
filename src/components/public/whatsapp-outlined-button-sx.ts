import type { SxProps, Theme } from '@mui/material/styles';

/** Outlined WhatsApp control — paper bg follows light/dark theme. */
export const whatsappOutlinedButtonSx: SxProps<Theme> = {
  borderColor: 'divider',
  borderWidth: 2,
  color: 'primary.main',
  bgcolor: 'background.paper',
  '&:hover': {
    borderColor: 'primary.light',
    bgcolor: 'background.paper',
  },
};
