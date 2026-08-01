'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Button, type SxProps, type Theme } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { paths } from '@/paths';

/** Returns to the user profile dashboard (`/user/dashboard`), or a custom parent. */
export function UserDashboardBackLink({
  href = paths.user.dashboard,
  label = 'Kthehu te paneli',
  sx,
}: {
  href?: string;
  label?: string;
  sx?: SxProps<Theme>;
}) {
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
      {label}
    </Button>
  );
}
