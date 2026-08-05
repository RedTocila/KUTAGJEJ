'use client';

import * as React from 'react';
import { Button, IconButton, type SxProps, type Theme } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';
import { productBackButtonSx } from '@/components/public/product-browse-chrome';

/**
 * Returns to the mobile profile tab (portal hub at `/user/dashboard`), or a custom parent.
 * Uses hard navigation — soft Next.js nav is unreliable in this app shell.
 */
export function UserDashboardBackLink({
  href = paths.user.dashboard,
  label = 'Kthehu te profili',
  sx,
}: {
  href?: string;
  label?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Button
      type="button"
      size="small"
      startIcon={React.createElement(ArrowLeftIcon, { size: 18, weight: 'bold' })}
      onClick={() => hardNavigate(href)}
      sx={[
        {
          alignSelf: 'flex-start',
          textTransform: 'none',
          fontWeight: 700,
          color: 'text.secondary',
          px: 0.5,
          minHeight: 36,
          '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {label}
    </Button>
  );
}

/** Dismisses the post-listing flow and returns to the dashboard hub. */
export function UserDashboardCloseButton({
  href = paths.user.dashboard,
  sx,
}: {
  href?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <IconButton
      type="button"
      aria-label="Mbyll"
      onClick={() => hardNavigate(href)}
      size="small"
      sx={[
        productBackButtonSx,
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <XIcon size={20} weight="bold" />
    </IconButton>
  );
}
