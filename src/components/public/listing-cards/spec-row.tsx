'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

export interface Spec {
  icon: React.ReactNode;
  label: string;
  title?: string;
}

export function SpecRow({ specs, variant = 'default' }: { specs: Spec[]; variant?: 'default' | 'featured' }) {
  const filtered = specs.filter((s) => Boolean(s.label));
  if (filtered.length === 0) return null;

  if (variant === 'featured') {
    return (
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        {filtered.map(({ icon, label, title }, index) => (
          <Stack
            key={`${label}-${index}`}
            direction="row"
            spacing={0.75}
            title={title ?? label}
            sx={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' }}
          >
            <Box component="span" aria-hidden sx={{ display: 'inline-flex', flexShrink: 0, color: 'text.secondary' }}>
              {icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: 'text.primary',
                lineHeight: 1.25,
                fontWeight: 600,
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Typography>
          </Stack>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        rowGap: 0.75,
        columnGap: 0.75,
        alignItems: 'center',
      }}
    >
      {filtered.map(({ icon, label, title }, index) => (
        <Box
          key={`${label}-${index}`}
          title={title ?? label}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.9,
            py: 0.45,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.12 : 0.07),
            color: 'text.secondary',
          }}
        >
          <Box component="span" aria-hidden sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, color: 'primary.main' }}>
            {icon}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.primary',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
