'use client';

import * as React from 'react';
import { Box } from '@mui/material';

export const BOOST_COIN_SRC = '/boost-coin.png';

export interface BoostCoinIconProps {
  /** Pixel size (Phosphor-style). Takes precedence over `fontSize`. */
  size?: number;
  /** CSS size used by nav icons (e.g. `var(--icon-fontSize-md)`). */
  fontSize?: string | number;
  className?: string;
  /** Accepted for Phosphor / nav API compatibility; unused for the image. */
  color?: string;
  fill?: string;
  weight?: 'bold' | 'duotone' | 'fill' | 'light' | 'regular' | 'thin';
  alt?: string;
  style?: React.CSSProperties;
}

function resolveDim(size?: number, fontSize?: string | number): number | string {
  if (typeof size === 'number' && Number.isFinite(size)) return size;
  if (typeof fontSize === 'number' && Number.isFinite(fontSize)) return fontSize;
  if (typeof fontSize === 'string' && fontSize.trim()) return fontSize;
  return 24;
}

/** Brand Boost Coin mark — drop-in where Phosphor `Coins` was used for BC. */
export function BoostCoinIcon({
  size,
  fontSize,
  className,
  alt = 'Boost Coin',
  style,
}: BoostCoinIconProps): React.JSX.Element {
  const dim = resolveDim(size, fontSize);

  return (
    <Box
      component="img"
      src={BOOST_COIN_SRC}
      alt={alt}
      className={className}
      sx={{
        width: dim,
        height: dim,
        display: 'block',
        flexShrink: 0,
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}
