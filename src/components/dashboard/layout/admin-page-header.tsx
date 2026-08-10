'use client';

import * as React from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

/**
 * Shared admin page title: icon + title + subtitle, optional actions on the right.
 * Matches user portal header chrome (product green tile, weight 800 title).
 */
export function AdminPageHeader({
  icon,
  title,
  description,
  eyebrow,
  actions,
  sx,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={[
        {
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            mt: '1px',
            borderRadius: 2.25,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
          }}
        >
          {icon}
        </Box>
        <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
          {eyebrow ? (
            <Typography
              variant="overline"
              sx={{
                letterSpacing: '0.1em',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.65rem',
                lineHeight: 1.2,
              }}
            >
              {eyebrow}
            </Typography>
          ) : null}
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, maxWidth: 640 }}>
              {description}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
      {actions ? (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {actions}
        </Box>
      ) : null}
    </Stack>
  );
}
