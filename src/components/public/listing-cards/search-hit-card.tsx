'use client';

import * as React from 'react';
import Link from 'next/link';
import { Paper } from '@mui/material';

import { MOTION } from '@/styles/motion';

/** Compact search-result shell — same row card used for profiles and listings. */
export function SearchHitCard({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }}
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
