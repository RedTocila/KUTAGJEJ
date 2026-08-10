'use client';

import * as React from 'react';
import { Button, CircularProgress, Stack } from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { productButtonSx } from '@/styles/product-sx';

/** Shared owner-edit dialog — theme-aware paper, blur backdrop, close control. */
export function OwnerEditSectionDialog({
  open,
  title,
  onClose,
  onApply,
  children,
  applyLabel = 'Apliko',
  applying = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void | Promise<void>;
  children: React.ReactNode;
  applyLabel?: string;
  applying?: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const busy = applying || pending;

  const handleApply = async () => {
    if (busy) return;
    setPending(true);
    try {
      await onApply();
    } finally {
      setPending(false);
    }
  };

  return (
    <ProductDialog open={open} onClose={busy ? () => undefined : onClose} fullWidth maxWidth="xs" scroll="paper">
      <ProductDialogTitle onClose={busy ? undefined : onClose}>{title}</ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2.25}>{children}</Stack>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button
          variant="contained"
          onClick={() => void handleApply()}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ ...productButtonSx, px: 2.5 }}
        >
          {busy ? 'Duke ngarkuar…' : applyLabel}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}
