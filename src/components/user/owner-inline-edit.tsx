'use client';

import * as React from 'react';
import { Button, Stack } from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { OwnerEditPencil, type OwnerEditHandlers, type OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { productButtonSx } from '@/styles/product-sx';

/** Compact Done / Cancel row under an inline editor. */
export function OwnerInlineEditActions({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%', pt: 0.25 }}
    >
      <Button
        size="small"
        color="inherit"
        onClick={onCancel}
        startIcon={<XIcon size={14} weight="bold" />}
        sx={{ ...productButtonSx, fontWeight: 700, px: 1.25, minWidth: 0 }}
      >
        Anulo
      </Button>
      <Button
        size="small"
        variant="contained"
        color="primary"
        onClick={onDone}
        startIcon={<CheckIcon size={14} weight="bold" />}
        sx={{
          ...productButtonSx,
          px: 1.5,
          minWidth: 0,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: `0 2px 10px ${primaryMainAlpha(0.35)}`,
          '&:hover': {
            bgcolor: 'primary.dark',
            boxShadow: `0 3px 12px ${primaryMainAlpha(0.45)}`,
          },
        }}
      >
        Gati
      </Button>
    </Stack>
  );
}

/**
 * Shows `editor` when this field is active; otherwise shows `children` + pencil.
 * Prefers `onStartInlineEdit` over legacy section popups.
 */
export function OwnerEditableSpot({
  field,
  ownerEdit,
  label,
  children,
  legacyOnClick,
  align = 'center',
  sx,
}: {
  field: OwnerInlineField;
  ownerEdit?: OwnerEditHandlers;
  label: string;
  children: React.ReactNode;
  /** Fallback when inline handlers are not provided (legacy popup). */
  legacyOnClick?: () => void;
  align?: 'center' | 'flex-start';
  sx?: React.ComponentProps<typeof Stack>['sx'];
}) {
  const editing = ownerEdit?.editingField === field && ownerEdit.inlineEditors?.[field];
  if (editing) {
    return <>{ownerEdit!.inlineEditors![field]}</>;
  }

  const onClick = ownerEdit?.onStartInlineEdit
    ? () => ownerEdit.onStartInlineEdit!(field)
    : legacyOnClick;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: align, flexWrap: 'wrap', ...((sx as object) || {}) }}>
      {children}
      {onClick ? <OwnerEditPencil label={label} onClick={onClick} /> : null}
    </Stack>
  );
}
