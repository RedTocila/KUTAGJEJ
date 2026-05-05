'use client';

import * as React from 'react';
import { alpha, Box, Stack, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

export interface Spec {
  /** Pre-bound Phosphor icon component (the SSR variant). */
  Icon: PhosphorIcon;
  /** Short label rendered next to the icon (e.g. "75 m²", "3"). */
  label: string;
  /** Optional accessible title — shown on hover; defaults to `label`. */
  title?: string;
}

/**
 * Inline row of icon + label pills used inside the public listing cards.
 * Each pill is a small bordered chip with a soft background that calls
 * attention to the property's specs without competing with the price or
 * title. Wraps to a second line on narrow widths so cards stay readable on
 * mobile.
 */
export function SpecRow({ specs }: { specs: Spec[] }) {
  const filtered = specs.filter((s) => Boolean(s.label));
  if (filtered.length === 0) return null;

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
      {filtered.map(({ Icon, label, title }, index) => (
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
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.07),
            color: 'primary.main',
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
          >
            <Icon size={14} weight="bold" />
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
