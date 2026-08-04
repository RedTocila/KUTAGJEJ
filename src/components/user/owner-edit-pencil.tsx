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

/** Handlers passed into public detail views while editing as owner. */
export type OwnerEditHandlers = {
  onEditPhotos?: () => void;
  onEditInfo?: () => void;
  onEditHours?: () => void;
  onEditMenu?: () => void;
  onEditPortfolio?: () => void;
  onEditSpecs?: () => void;
  onEditPrice?: () => void;
};
