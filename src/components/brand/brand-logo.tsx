'use client';

import * as React from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import Box, { type BoxProps } from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { brandLogoSrc, config } from '@/config';

export interface BrandLogoProps {
  /** Pixel height of the logo image; width follows aspect ratio unless `width` is set. */
  height?: number;
  width?: number;
  /** Renders {@link config.site.name} beside the mark (hide if the image already includes the wordmark). */
  showWordmark?: boolean;
  sx?: BoxProps['sx'];
  imgSx?: SxProps<Theme>;
  wordmarkSx?: SxProps<Theme>;
}

export function BrandLogo({
  height = 40,
  width,
  showWordmark = false,
  sx,
  imgSx,
  wordmarkSx,
}: BrandLogoProps) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.25,
        textDecoration: 'none',
        color: 'inherit',
        ...sx,
      }}
    >
      <Box
        alt={config.site.name}
        component="img"
        src={brandLogoSrc}
        sx={{
          height,
          width: width ?? 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
          ...imgSx,
        }}
      />
      {showWordmark ? (
        <Typography component="span" sx={{ fontWeight: 800, lineHeight: 1.15, ...wordmarkSx }}>
          {config.site.name}
        </Typography>
      ) : null}
    </Box>
  );
}
