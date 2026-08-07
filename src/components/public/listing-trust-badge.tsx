'use client';

import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

const AMBER = '#f59e0b';
const AMBER_SOFT = '#fcd34d';
const AMBER_DEEP = '#d97706';

/**
 * Grow / Elite Trust Badge — flat amber medallion with a star.
 * Kept light so it sits next to the verified shield without looking heavy.
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
        {/* Serrated medal rim */}
        <path d={SERRATED_MEDAL_PATH} fill={AMBER} />
        {/* Inner disc — lighter amber, not white */}
        <circle cx="32" cy="32" r="15" fill={AMBER_SOFT} />
        {/* Star */}
        <path d={STAR_PATH} fill={AMBER_DEEP} />
      </svg>
    </Box>
  );
}

/** 16-point scalloped seal outline centered at 32,32. */
const SERRATED_MEDAL_PATH = (() => {
  const cx = 32;
  const cy = 32;
  const points = 16;
  const rOuter = 30;
  const rInner = 25.5;
  const parts: string[] = [];
  for (let i = 0; i < points; i += 1) {
    const a0 = (Math.PI * 2 * i) / points - Math.PI / 2;
    const a1 = (Math.PI * 2 * (i + 0.5)) / points - Math.PI / 2;
    const x0 = cx + Math.cos(a0) * rOuter;
    const y0 = cy + Math.sin(a0) * rOuter;
    const x1 = cx + Math.cos(a1) * rInner;
    const y1 = cy + Math.sin(a1) * rInner;
    parts.push(`${i === 0 ? 'M' : 'L'}${x0.toFixed(2)} ${y0.toFixed(2)}`);
    parts.push(`L${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
})();

/** 5-point star. */
const STAR_PATH = (() => {
  const cx = 32;
  const cy = 32;
  const spikes = 5;
  const rOuter = 9.5;
  const rInner = 4;
  const parts: string[] = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
})();
