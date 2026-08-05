'use client';

import * as React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  type DialogActionsProps,
  type DialogContentProps,
  type DialogProps,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  productDialogActionsSx,
  productDialogCloseButtonSx,
  productDialogContentSx,
  productDialogSlotProps,
  productDialogTitleSx,
} from '@/styles/product-sx';

function mergeDialogSlotProps(
  base: DialogProps['slotProps'],
  override?: DialogProps['slotProps'],
): DialogProps['slotProps'] {
  if (!override) return base;
  const baseBackdrop = base?.backdrop as { sx?: object } | undefined;
  const overrideBackdrop = override.backdrop as { sx?: object } | undefined;
  const basePaper = base?.paper as { sx?: object; elevation?: number } | undefined;
  const overridePaper = override.paper as { sx?: object; elevation?: number } | undefined;

  return {
    ...base,
    ...override,
    backdrop: {
      ...base?.backdrop,
      ...override.backdrop,
      sx: { ...baseBackdrop?.sx, ...overrideBackdrop?.sx },
    },
    paper: {
      ...base?.paper,
      ...override.paper,
      sx: { ...basePaper?.sx, ...overridePaper?.sx },
    },
  } as DialogProps['slotProps'];
}

export type ProductDialogProps = Omit<DialogProps, 'slotProps'> & {
  slotProps?: DialogProps['slotProps'];
};

/** Immersive dialog — black paper, blurred backdrop. */
export function ProductDialog({ slotProps, ...props }: ProductDialogProps) {
  return (
    <Dialog
      {...props}
      slotProps={mergeDialogSlotProps(productDialogSlotProps, slotProps)}
    />
  );
}

export function ProductDialogTitle({
  children,
  subtitle,
  onClose,
  sx,
}: {
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  sx?: object;
}) {
  return (
    <DialogTitle sx={{ ...productDialogTitleSx, ...sx }}>
      {children}
      {subtitle ? (
        <Typography
          component="span"
          variant="body2"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}
        >
          {subtitle}
        </Typography>
      ) : null}
      {onClose ? (
        <IconButton aria-label="Mbyll" onClick={onClose} size="small" sx={productDialogCloseButtonSx}>
          <XIcon size={18} weight="bold" />
        </IconButton>
      ) : null}
    </DialogTitle>
  );
}

export function ProductDialogContent({ sx, ...props }: DialogContentProps) {
  return <DialogContent sx={{ ...productDialogContentSx, ...sx }} {...props} />;
}

export function ProductDialogActions({ sx, ...props }: DialogActionsProps) {
  return <DialogActions sx={{ ...productDialogActionsSx, ...sx }} {...props} />;
}
