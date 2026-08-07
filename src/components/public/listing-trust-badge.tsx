'use client';

import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

const AMBER = '#f59e0b';
const STAR_YELLOW = '#fde047';

/**
 * Grow / Elite Trust Badge — amber scalloped seal with yellow star
 * (silhouette from the verified-stamp icon, amber instead of blue).
 */
export function ListingTrustBadge({
  size = 18,
  'aria-label': ariaLabel = 'Trust Badge — paketë Grow ose Elite',
  sx,
}: {
  size?: number;
  'aria-label'?: string;
  sx?: BoxProps['sx'];
}) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        lineHeight: 0,
        verticalAlign: 'middle',
        ...sx,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{ display: 'block' }}
      >
        <path d={SCALLOPED_SEAL_PATH} fill={AMBER} />
        {/* Phosphor Star (fill) — softer classic tips vs sharp geometric star */}
        <g transform="translate(32 32) scale(0.155) translate(-128 -128)">
          <path d={PHOSPHOR_STAR_FILL} fill={STAR_YELLOW} />
        </g>
      </svg>
    </Box>
  );
}

/** @phosphor-icons/react Star weight="fill" (256 viewBox). */
const PHOSPHOR_STAR_FILL =
  'M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z';

/** Traced silhouette of the provided trust-stamp icon (12 soft lobes). */
const SCALLOPED_SEAL_PATH =
  'M62.49 32.00 L61.92 34.09 L60.34 35.98 L58.20 37.57 L56.39 38.99 L55.89 39.76 L55.80 40.66 L56.45 42.89 L57.25 45.42 L57.42 47.89 L56.65 49.91 L54.95 51.25 L52.52 51.82 L49.90 51.88 L47.58 51.94 L46.74 52.29 L46.16 52.99 L45.39 55.19 L44.52 57.66 L43.23 59.80 L41.41 60.96 L39.25 61.06 L36.96 60.11 L34.79 58.57 L32.88 57.29 L32.00 57.10 L31.12 57.30 L29.20 58.64 L27.04 60.15 L24.77 61.00 L22.59 60.96 L20.78 59.77 L19.49 57.64 L18.63 55.16 L17.86 52.97 L17.27 52.28 L16.42 51.94 L14.10 51.88 L11.49 51.81 L9.06 51.25 L7.37 49.90 L6.61 47.87 L6.81 45.39 L7.58 42.87 L8.21 40.66 L8.11 39.76 L7.61 38.99 L5.80 37.57 L3.67 35.98 L2.08 34.09 L1.50 32.00 L2.08 29.91 L3.67 28.02 L5.80 26.43 L7.63 25.01 L8.11 24.24 L8.20 23.34 L7.55 21.11 L6.76 18.58 L6.58 16.11 L7.35 14.09 L9.05 12.75 L11.48 12.18 L14.10 12.12 L16.41 12.05 L17.26 11.71 L17.84 11.01 L18.62 8.83 L19.48 6.34 L20.77 4.20 L22.59 3.04 L24.75 2.94 L27.04 3.89 L29.21 5.43 L31.12 6.70 L32.00 6.88 L32.88 6.69 L34.80 5.40 L36.96 3.88 L39.25 2.94 L41.41 3.04 L43.23 4.22 L44.51 6.35 L45.36 8.85 L46.14 11.03 L46.73 11.72 L47.58 12.06 L49.90 12.12 L52.51 12.19 L54.94 12.75 L56.64 14.10 L57.40 16.13 L57.19 18.61 L56.42 21.13 L55.78 23.35 L55.87 24.24 L56.37 25.01 L58.20 26.43 L60.33 28.02 L61.92 29.91 Z';
