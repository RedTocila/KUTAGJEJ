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
  const scrollTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  };

  if (variant === 'list') {
    return (
      <Box
        component={Link}
        href={href}
        onClick={scrollTop}
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
      variant="outlined"
      onClick={scrollTop}
      sx={{
        height: '100%',
        borderRadius: 2.5,
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-3px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 12px 28px rgba(0, 0, 0, 0.35)'
                : '0 12px 28px rgba(15, 23, 10, 0.1)',
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
      }}
    >
      {children}
    </Paper>
  );
}
