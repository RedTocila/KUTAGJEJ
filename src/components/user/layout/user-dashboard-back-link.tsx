'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Button, IconButton, type SxProps, type Theme } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { productBackButtonSx } from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { paths } from '@/paths';

/**
 * Returns to the previous page. Falls back to the portal hub when this tab has no in-app history.
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
  const historyBack = useHistoryBackProps(href);
  return (
    <Button
      component={RouterLink}
      size="small"
      startIcon={React.createElement(ArrowLeftIcon, { size: 18, weight: 'bold' })}
      {...historyBack}
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
      {label ?? t.chrome.back}
    </Button>
  );
}

/** Dismisses the current flow and returns to the previous page (fallback `href`). */
export function UserDashboardCloseButton({
  href = paths.user.dashboard,
  sx,
}: {
  href?: string;
  sx?: SxProps<Theme>;
}) {
  const t = useCopy();
  const historyBack = useHistoryBackProps(href);
  return (
    <IconButton
      component={RouterLink}
      aria-label={t.common.close}
      size="small"
      {...historyBack}
      sx={[
        productBackButtonSx,
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <XIcon size={20} weight="bold" />
    </IconButton>
  );
}
