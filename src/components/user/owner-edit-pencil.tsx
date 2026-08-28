'use client';

import * as React from 'react';
import { IconButton, Tooltip, type SxProps, type Theme } from '@mui/material';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';

/** Compact pencil control shown next to editable fields in owner-preview mode. */
export function OwnerEditPencil({
  label,
  onClick,
  sx,
  size = 'sm',
}: {
  label: string;
  onClick: () => void;
  sx?: SxProps<Theme>;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'md' ? 36 : 28;
  const icon = size === 'md' ? 18 : 15;
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        size="small"
        sx={[
          {
            width: dim,
            height: dim,
            flexShrink: 0,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            border: '2px solid',
            borderColor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
            '&:hover': { bgcolor: 'primary.dark' },
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        <PencilSimpleIcon size={icon} weight="bold" />
      </IconButton>
    </Tooltip>
  );
}

/** Which field is being edited inline on the public preview. */
export type OwnerInlineField =
  | 'title'
  | 'price'
  | 'contactPhone'
  | 'location'
  | 'description'
  | 'specs'
  | 'category'
  | 'hours'
  | 'services'
  | 'mobileCta';

/** Handlers passed into public detail views while editing as owner. */
export type OwnerEditHandlers = {
  /** Optional focus: cover (gallery) vs avatar (profile circle). Same dialog. */
  onEditPhotos?: (focus?: 'cover' | 'avatar') => void;
  onEditHours?: () => void;
  onEditMenu?: () => void;
  onEditPortfolio?: () => void;
  /** @deprecated Prefer `onStartInlineEdit` — kept for gradual migration. */
  onEditInfo?: () => void;
  /** @deprecated Prefer `onStartInlineEdit('specs')`. */
  onEditSpecs?: () => void;
  /** @deprecated Prefer `onStartInlineEdit('price')`. */
  onEditPrice?: () => void;

  /** Currently active inline field (only one at a time). */
  editingField?: OwnerInlineField | null;
  /** Open inline editor for a single field (no popup form). */
  onStartInlineEdit?: (field: OwnerInlineField) => void;
  /** Per-field editor nodes rendered in place of the display + pencil. */
  inlineEditors?: Partial<Record<OwnerInlineField, React.ReactNode>>;
};
