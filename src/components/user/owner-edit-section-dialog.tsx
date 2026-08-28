'use client';

import * as React from 'react';
import { Button, CircularProgress, Stack, type DialogProps } from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { productButtonSx } from '@/styles/product-sx';

const OwnerEditReorderContext = React.createContext(false);

export function useOwnerEditReorderMode(): boolean {
  return React.useContext(OwnerEditReorderContext);
}

/** Shared owner-edit dialog — theme-aware paper, blur backdrop, close control. */
export function OwnerEditSectionDialog({
  open,
  title,
  onClose,
  onApply,
  children,
  applyLabel = 'Apliko',
  applying = false,
  maxWidth = 'xs',
  reorderable = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: () => void | Promise<void>;
  children: React.ReactNode;
  applyLabel?: string;
  applying?: boolean;
  maxWidth?: DialogProps['maxWidth'];
  reorderable?: boolean;
}) {
  const [pending, setPending] = React.useState(false);
  const [reorderMode, setReorderMode] = React.useState(false);
  const busy = applying || pending;

  React.useEffect(() => {
    if (!open) setReorderMode(false);
  }, [open]);

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
    <OwnerEditReorderContext.Provider value={reorderable && reorderMode}>
      <ProductDialog
        open={open}
        onClose={busy ? () => undefined : onClose}
        fullWidth
        maxWidth={maxWidth}
        scroll="paper"
      >
        <ProductDialogTitle onClose={busy ? undefined : onClose}>{title}</ProductDialogTitle>
        <ProductDialogContent>
          <Stack spacing={2.25}>{children}</Stack>
        </ProductDialogContent>
        <ProductDialogActions>
          <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'flex-end' }}>
            {reorderable ? (
              <Button
                variant={reorderMode ? 'contained' : 'outlined'}
                onClick={() => setReorderMode((active) => !active)}
                disabled={busy}
                sx={{ ...productButtonSx, px: 2 }}
              >
                {reorderMode ? 'Përfundo' : 'Riorganizo'}
              </Button>
            ) : null}
            <Button
              variant="contained"
              onClick={() => void handleApply()}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ ...productButtonSx, px: 2.5 }}
            >
              {busy ? 'Duke ngarkuar…' : applyLabel}
            </Button>
          </Stack>
        </ProductDialogActions>
      </ProductDialog>
    </OwnerEditReorderContext.Provider>
  );
}
