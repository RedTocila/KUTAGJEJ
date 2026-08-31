'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Paper } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

import { MOTION } from '@/styles/motion';

export type SearchHitVariant = 'card' | 'list';

/** Text-column chrome for the messages-style search list (inset divider). */
export function searchHitListTextSx(divider: boolean): SxProps<Theme> {
  return {
    flex: '1 1 auto',
    minWidth: 0,
    py: 1.35,
    ...(divider
      ? {
          borderBottom: '1px solid',
          borderColor: 'divider',
        }
      : null),
  };
}

/** Compact search-result shell — card on browse/home, flat row on /kerko. */
export function SearchHitCard({
  href,
  children,
  variant = 'card',
}: {
  href: string;
  children: React.ReactNode;
  variant?: SearchHitVariant;
}): React.JSX.Element {
  if (variant === 'list') {
    return (
      <Box
        component={Link}
        href={href}
        sx={{
          display: 'block',
          px: { xs: 2, sm: 3 },
          py: 0,
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background-color 0.12s ease',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
          },
          '&:active': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
          },
        }}
      >
        {children}
      </Box>
    );
  }

  return (
    <Paper
      component={Link}
      href={href}
      sx={(theme) => ({
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        ...theme.applyStyles('dark', {
          backgroundColor: 'var(--mui-palette-background-paper)',
        }),
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        boxShadow: (paletteTheme) =>
          paletteTheme.palette.mode === 'dark'
            ? '0 14px 32px rgba(0, 0, 0, 0.42)'
            : 'none',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-3px)',
            boxShadow: (paletteTheme) =>
              paletteTheme.palette.mode === 'dark'
                ? '0 18px 38px rgba(0, 0, 0, 0.5)'
                : 'none',
          },
        },
        '&:active': {
          transform: 'scale(0.985)',
          boxShadow: 'none',
          transitionDuration: MOTION.press,
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none', boxShadow: 'none' },
          '&:active': { transform: 'none' },
        },
      })}
    >
      {children}
    </Paper>
  );
}
