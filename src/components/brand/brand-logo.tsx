'use client';

import * as React from 'react';
import { Box, Typography, type BoxProps, type SxProps, type Theme } from '@mui/material';

import { brandLogoSrc, config } from '@/config';
import { brandWordmarkFontFamily } from '@/styles/brand-font';

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

  const topRef = React.useRef<HTMLSpanElement | null>(null);
  const bottomRef = React.useRef<HTMLSpanElement | null>(null);
  const [gjejScale, setGjejScale] = React.useState(1);

  React.useLayoutEffect(() => {
    if (!stacked) {
      setGjejScale(1);
      return;
    }

    const matchWidths = () => {
      const top = topRef.current;
      const bottom = bottomRef.current;
      if (!top || !bottom) return;

      // Measure natural glyph width (ignore current scale).
      const prevTransform = bottom.style.transform;
      bottom.style.transform = 'none';
      const topW = top.getBoundingClientRect().width;
      const bottomW = bottom.getBoundingClientRect().width;
      bottom.style.transform = prevTransform;

      if (topW <= 0 || bottomW <= 0) return;
      const next = topW / bottomW;
      setGjejScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };

    matchWidths();
    void document.fonts?.ready.then(matchWidths);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(matchWidths) : null;
    if (ro && topRef.current) ro.observe(topRef.current);

    return () => {
      ro?.disconnect();
    };
  }, [stacked, segments, wordmarkSx]);

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
              fontFamily: brandWordmarkFontFamily,
              fontWeight: 700,
              letterSpacing: '-0.03em',
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
            <Box
              ref={topRef}
              component="span"
              sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', width: 'max-content' }}
            >
              {segments[0]}
            </Box>
            <Box
              ref={bottomRef}
              component="span"
              sx={{
                color: 'primary.main',
                fontWeight: 800,
                display: 'block',
                width: 'max-content',
                ...(stacked
                  ? {
                      transform: `scale(${gjejScale})`,
                      transformOrigin: 'left center',
                    }
                  : null),
              }}
            >
              {segments[1]}
            </Box>
          </Typography>
        ) : (
          <Typography
            component="span"
            sx={{
              fontFamily: brandWordmarkFontFamily,
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
