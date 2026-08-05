'use client';

import * as React from 'react';
import { Button, Stack } from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { productButtonSx } from '@/styles/product-sx';

/** Shared owner-edit dialog — black paper, blur backdrop, close control. */
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
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <ProductDialogTitle onClose={onClose}>{title}</ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2.25}>{children}</Stack>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button variant="contained" onClick={onApply} sx={{ ...productButtonSx, px: 2.5 }}>
          {applyLabel}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}
