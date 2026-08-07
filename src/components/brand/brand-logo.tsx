'use client';

import * as React from 'react';
import { Box, Typography, type BoxProps, type SxProps, type Theme } from '@mui/material';

import { brandLogoSrc, config } from '@/config';

export type BrandWordmarkPresentation = 'brand' | 'plain';
export type BrandWordmarkLayout = 'inline' | 'stacked';

export interface BrandLogoProps {
  /** Pixel height of the logo image; width follows aspect ratio unless `width` is set. */
  height?: number;
  width?: number;
  /** Renders the site name beside the mark (hide if the image already includes the wordmark). */
  showWordmark?: boolean;
  /**
   * `brand`: two-tone wordmark when `config.site.wordmarkSegments` is valid.
   * `plain`: single-line name using `wordmarkSx` only.
   */
  wordmarkPresentation?: BrandWordmarkPresentation;
  /**
   * `inline`: segments/name on one horizontal line (default).
   * `stacked`: brand segments one under the other (narrower header mark).
   */
  wordmarkLayout?: BrandWordmarkLayout;
  sx?: BoxProps['sx'];
  imgSx?: SxProps<Theme>;
  wordmarkSx?: SxProps<Theme>;
  /** Wrapper around the mark only (e.g. rounded tinted tile in the dashboard nav). */
  markSx?: SxProps<Theme>;
}

function resolvedWordmarkSegments(): readonly [string, string] | null {
  const segs = config.site.wordmarkSegments;
  if (!segs || segs[0] + segs[1] !== config.site.name) {
    return null;
  }
  return segs;
}

export function BrandLogo({
  height = 32,
  width,
  showWordmark = false,
  wordmarkPresentation = 'plain',
  wordmarkLayout = 'inline',
  sx,
  imgSx,
  wordmarkSx,
  markSx,
}: BrandLogoProps) {
  const segments = resolvedWordmarkSegments();
  const useBrandSplit = Boolean(showWordmark && wordmarkPresentation === 'brand' && segments);
  const stacked = wordmarkLayout === 'stacked' && useBrandSplit;

  const img = (
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
  );

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        textDecoration: 'none',
        color: 'inherit',
        '&, & *': { textDecoration: 'none' },
        ...sx,
      }}
    >
      {markSx ? (
        <Box sx={{ flexShrink: 0, lineHeight: 0, ...markSx }}>{img}</Box>
      ) : (
        img
      )}
      {showWordmark ? (
        useBrandSplit && segments ? (
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.04em',
              display: 'inline-flex',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              ...(stacked
                ? {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    lineHeight: 1.02,
                    rowGap: 0,
                  }
                : {
                    alignItems: 'baseline',
                    columnGap: 0.25,
                    lineHeight: 1.2,
                  }),
              ...wordmarkSx,
            }}
          >
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {segments[0]}
            </Box>
            <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>
              {segments[1]}
            </Box>
          </Typography>
        ) : (
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              ...wordmarkSx,
            }}
          >
            {config.site.name}
          </Typography>
        )
      ) : null}
    </Box>
  );
}
