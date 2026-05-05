'use client';

import * as React from 'react';
import { Typography } from '@mui/material';

/**
 * Two-line truncated description block used by the public listing cards.
 * Hidden when there's no text so cards without a description still align
 * cleanly.
 */
export function CardDescription({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        fontSize: '0.82rem',
        lineHeight: 1.45,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {text}
    </Typography>
  );
}
