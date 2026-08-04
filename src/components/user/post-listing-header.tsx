'use client';

import * as React from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { UserDashboardCloseButton } from '@/components/user/layout/user-dashboard-back-link';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { paths } from '@/paths';

export function PostListingHeader({
  icon: Icon,
  title,
  description,
  iconColor,
  iconBgcolor,
  descriptionColor,
  closeHref = paths.home,
}: {
  icon: PhosphorIcon;
  title: string;
  description?: string;
  iconColor?: string;
  iconBgcolor?: string;
  descriptionColor?: string;
  closeHref?: string;
}) {
  const iconTileSx: SxProps<Theme> = {
    width: 40,
    height: 40,
    mt: '1px',
    borderRadius: 2.25,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    bgcolor: iconBgcolor ?? ((t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12)),
    color: iconColor ?? 'primary.main',
  };

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
      <Box sx={iconTileSx}>{React.createElement(Icon, { size: 22, weight: 'duotone' })}</Box>

      <Stack spacing={0.4} sx={{ minWidth: 0, flex: 1, pt: 0.2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              minWidth: 0,
              pr: 1,
            }}
          >
            {title}
          </Typography>
          <UserDashboardCloseButton href={closeHref} sx={{ flexShrink: 0, mt: -0.25 }} />
        </Stack>
        {description ? (
          <Typography
            variant="body2"
            sx={{
              lineHeight: 1.45,
              color: descriptionColor ?? 'text.secondary',
              pr: { xs: 5, sm: 6 },
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

/** Spacing wrapper for listing forms (sections provide their own cards). */
export function PostListingFormSurface({ children }: { children: React.ReactNode }) {
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>{children}</Box>;
}
