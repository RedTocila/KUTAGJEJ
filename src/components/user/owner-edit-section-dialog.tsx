'use client';

import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { productButtonSx, productDialogSlotProps } from '@/styles/product-sx';

/** Shared owner-edit dialog — paper surface, blur backdrop. */
export function OwnerEditSectionDialog({
  open,
  title,
  onClose,
  onApply,
  children,
  applyLabel = 'Apliko',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void;
  children: React.ReactNode;
  applyLabel?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      scroll="paper"
      slotProps={productDialogSlotProps}
    >
      <DialogTitle
        sx={{
          position: 'relative',
          px: 2.5,
          pt: 2.5,
          pb: 1,
          pr: 6,
          fontWeight: 800,
          fontSize: '1.125rem',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
        <IconButton
          aria-label="Mbyll"
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
            borderRadius: 2,
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <XIcon size={18} weight="bold" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 2.5, pb: 1.5, pt: '8px !important' }}>
        <Stack spacing={2.25}>{children}</Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 1 }}>
        <Button
          variant="contained"
          onClick={onApply}
          sx={{ ...productButtonSx, px: 2.5 }}
        >
          {applyLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
