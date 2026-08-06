'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Button, IconButton, type SxProps, type Theme } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { productBackButtonSx } from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';

/**
 * Returns to the mobile profile tab (portal hub at `/user/dashboard`), or a custom parent.
 */
export function UserDashboardBackLink({
  href = paths.user.dashboard,
  label,
  sx,
}: {
  href?: string;
  label?: string;
  sx?: SxProps<Theme>;
}) {
  const t = useCopy();
  return (
    <Button
      component={RouterLink}
      href={href}
      size="small"
      startIcon={React.createElement(ArrowLeftIcon, { size: 18, weight: 'bold' })}
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
      {label ?? t.chrome.backToProfile}
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
  const t = useCopy();
  return (
    <IconButton
      component={RouterLink}
      href={href}
      aria-label={t.common.close}
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
