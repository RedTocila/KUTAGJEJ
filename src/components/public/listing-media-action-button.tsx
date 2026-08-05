'use client';

import * as React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

export function pseudoRandomListingActionCount(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return 8 + (hash % 493);
}

export function ListingMediaActionButton({
  'aria-label': ariaLabel,
  count,
  icon,
  active = false,
  disabled = false,
  surface = 'card',
  accent = 'primary',
  onClick,
}: {
  'aria-label': string;
  count: number;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** `hero` — solid dark glass; `glass` — softer dark transparent; `card` — listing card chips. */
  surface?: 'hero' | 'glass' | 'card';
  /** Accent for the active / emphasized state — amber on premium cards. */
  accent?: 'primary' | 'warning' | 'error';
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const accentToken = `${accent}.main` as const;
  const surfaceStyles =
    surface === 'hero'
      ? {
          bgcolor: alpha('#000', 0.45),
          color: active ? accentToken : '#fff',
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: active ? accentToken : alpha('#fff', 0.18),
          '&:hover': { bgcolor: alpha('#000', 0.62) },
          '&.Mui-disabled': {
            bgcolor: alpha('#000', 0.45),
            color: '#fff',
            opacity: 1,
          },
        }
      : surface === 'glass'
        ? {
            bgcolor: alpha('#000', 0.28),
            color: active ? accentToken : '#fff',
            backdropFilter: 'blur(12px)',
            border: '1px solid',
            borderColor: active ? accentToken : alpha('#fff', 0.14),
            '&:hover': { bgcolor: alpha('#000', 0.38) },
            '&.Mui-disabled': {
              bgcolor: alpha('#000', 0.28),
              color: '#fff',
              opacity: 0.85,
            },
          }
        : {
            bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.92)',
            color: active || accent === 'warning' ? accentToken : 'text.primary',
            border: '1px solid',
            borderColor: active || accent === 'warning' ? accentToken : 'divider',
            '&:hover': {
              bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.98)',
            },
          };

  return (
    <IconButton
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        height: 32,
        px: 1,
        py: 0.5,
        borderRadius: 999,
        ...surfaceStyles,
      }}
    >
      <Box component="span" aria-hidden sx={{ display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
        {icon}
      </Box>
      <Typography
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1,
          color: 'inherit',
          pointerEvents: 'none',
        }}
      >
        {count}
      </Typography>
    </IconButton>
  );
}
