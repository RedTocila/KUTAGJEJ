'use client';

import * as React from 'react';
import { Button, CircularProgress, Stack, Typography } from '@mui/material';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useCopy } from '@/hooks/use-copy';

import { formatBc } from './package-ui';

export function BcPurchaseDialog({
  open,
  packageLabel,
  priceBc,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  packageLabel: string;
  priceBc: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useCopy();

  return (
    <ProductDialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={busy ? undefined : onClose} sx={{ textAlign: 'center' }}>
        {t.packages.bcPurchaseConfirmTitle}
      </ProductDialogTitle>
      <ProductDialogContent sx={{ textAlign: 'center' }}>
        <Typography color="text.secondary">
          {t.packages.bcPurchaseConfirmBody(packageLabel, formatBc(priceBc))}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', justifyContent: 'center', mt: 2, color: 'warning.main' }}
        >
          <BoostCoinIcon size={20} />
          <Typography sx={{ fontWeight: 800 }}>{formatBc(priceBc)} BC</Typography>
        </Stack>
      </ProductDialogContent>
      <ProductDialogActions sx={{ justifyContent: 'center' }}>
        <Button onClick={onClose} disabled={busy} sx={{ fontWeight: 700 }}>
          {t.packages.notNow}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <BoostCoinIcon size={16} />}
          sx={{ fontWeight: 800 }}
        >
          {t.packages.bcPurchaseConfirmAction}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}
