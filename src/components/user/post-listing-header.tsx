'use client';

import * as React from 'react';
import { Box, Skeleton, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';

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
    borderRadius: 2.25,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    bgcolor: iconBgcolor ?? ((t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12)),
    color: iconColor ?? 'primary.main',
  };

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: description ? 'flex-start' : 'center', minWidth: 0 }}
    >
      <Box sx={iconTileSx}>{React.createElement(Icon, { size: 22, weight: 'duotone' })}</Box>

      <Stack spacing={description ? 0.4 : 0} sx={{ minWidth: 0, flex: 1, pt: description ? 0.2 : 0 }}>
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

/** Field placeholders under an already-visible post-listing header. */
export function PostListingFormFieldsSkeleton(): React.JSX.Element {
  return (
    <PostListingFormSurface>
      <Skeleton variant="rounded" animation="wave" height={160} sx={{ borderRadius: 2.5 }} />
      <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={120} sx={{ borderRadius: 2 }} />
      <Skeleton variant="rounded" animation="wave" height={48} sx={{ borderRadius: 2 }} />
    </PostListingFormSurface>
  );
}

/**
 * Client-only loading chrome for post-listing routes.
 * Icons stay inside this module so Server layouts/loading files never pass functions.
 */
export function PostListingPageLoading({ title = 'Posto njoftim' }: { title?: string }): React.JSX.Element {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke u ngarkuar">
      <PostListingHeader icon={BuildingsIcon} title={title} />
      <PostListingFormFieldsSkeleton />
    </Stack>
  );
}

/** Placeholder while a listing form / AI Build page is opening. */
export function PostListingFormSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke u ngarkuar">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Skeleton variant="rounded" animation="wave" width={40} height={40} sx={{ borderRadius: 2.25 }} />
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" animation="wave" width="42%" height={36} />
          <Skeleton variant="text" animation="wave" width="28%" height={20} />
        </Stack>
      </Stack>
      <PostListingFormFieldsSkeleton />
    </Stack>
  );
}
