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
  sx,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={[{ alignItems: 'flex-start', minWidth: 0 }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>
      <Box
        sx={{
          width: 36,
          height: 36,
          mt: '2px',
          borderRadius: 1.5,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: primaryMainAlpha(0.12),
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>
      <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
            {description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
