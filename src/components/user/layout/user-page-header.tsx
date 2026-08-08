'use client';

import * as React from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

/**
 * Portal page title: icon sits on the first text line; subtitle follows under the title.
 */
export function UserPageHeader({
  icon,
  title,
  description,
  action,
  sx,
  iconSx,
  descriptionSx,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Optional control aligned to the right of the title row (e.g. Leads). */
  action?: React.ReactNode;
  sx?: SxProps<Theme>;
  /** Optional override for the icon tile (color / bgcolor). */
  iconSx?: SxProps<Theme>;
  descriptionSx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={[{ alignItems: 'flex-start', minWidth: 0, width: '100%' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Box
        sx={[
          {
            width: 40,
            height: 40,
            mt: '1px',
            borderRadius: 2.25,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
          },
          ...(Array.isArray(iconSx) ? iconSx : iconSx ? [iconSx] : []),
        ]}
      >
        {icon}
      </Box>
      <Stack spacing={0.4} sx={{ minWidth: 0, flex: 1, pt: 0.2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, minWidth: 0 }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.01em', minWidth: 0 }}
          >
            {title}
          </Typography>
          {action ? <Box sx={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>{action}</Box> : null}
        </Stack>
        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={[
              { lineHeight: 1.45 },
              ...(Array.isArray(descriptionSx) ? descriptionSx : descriptionSx ? [descriptionSx] : []),
            ]}
          >
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
