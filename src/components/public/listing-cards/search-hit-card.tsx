'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
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

/** Compact search-result shell — borderless card on browse/home, flat row on /kerko. */
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
    <Box
      component={Link}
      href={href}
      sx={{
        height: '100%',
        borderRadius: 0,
        border: 'none',
        backgroundColor: 'transparent',
        p: { xs: 0.25, sm: 0.4 },
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        boxShadow: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: `transform ${MOTION.release} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            transform: 'translateY(-3px)',
          },
        },
        '&:active': {
          transform: 'scale(0.985)',
          transitionDuration: MOTION.press,
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none' },
          '&:active': { transform: 'none' },
        },
      }}
    >
      {children}
    </Box>
  );
}
