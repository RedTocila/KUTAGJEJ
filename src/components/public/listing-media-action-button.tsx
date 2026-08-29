'use client';

import * as React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import { MOTION } from '@/styles/motion';

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
  compact = false,
  onClick,
}: {
  'aria-label': string;
  count: number | null;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** `hero` — solid dark glass; `glass` — softer dark transparent; `card` — listing card chips. */
  surface?: 'hero' | 'glass' | 'card';
  /** Accent for the active / emphasized state. Bookmark should stay `primary` (green). */
  accent?: 'primary' | 'warning' | 'error';
  compact?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const accentToken = `${accent}.main` as const;
  const surfaceStyles: SxProps<Theme> =
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
            bgcolor: alpha('#000', 0.42),
            color: active || accent === 'warning' ? accentToken : '#fff',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: alpha('#fff', 0.18),
            textShadow: '0 1px 5px rgba(0, 0, 0, 0.65)',
            '&:hover': {
              bgcolor: alpha('#000', 0.56),
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
        gap: compact ? 0.35 : 0.5,
        minWidth: 0,
        height: compact ? 26 : 32,
        px: compact ? 0.75 : 1,
        py: compact ? 0.25 : 0.5,
        borderRadius: 999,
        transition: `background-color ${MOTION.fast} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, color ${MOTION.fast} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}`,
        '&:active': { transform: 'scale(0.92)', transitionDuration: MOTION.press },
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
          fontSize: compact ? '0.66rem' : '0.72rem',
          lineHeight: 1,
          color: 'inherit',
          pointerEvents: 'none',
        }}
      >
        {count ?? '…'}
      </Typography>
    </IconButton>
  );
}
