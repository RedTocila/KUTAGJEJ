'use client';

import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {children}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Anulo
        </Button>
        <Button variant="contained" onClick={onApply} sx={{ textTransform: 'none', fontWeight: 800 }}>
          {applyLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
