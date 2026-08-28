'use client';

import * as React from 'react';
import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';

import { formatPrice, listingPriceAccentColor } from './format-helpers';

/** Current price with optional strikethrough “was” compare price. */
export function ListingPrice({
  price,
  originalPrice = null,
  currency,
  isPremium = false,
  isOkazion = false,
  trailing,
  suffix,
  fontSize = '1.1rem',
  fontWeight = 800,
  sx,
}: {
  price: number | null | undefined;
  originalPrice?: number | null;
  currency: string | null | undefined;
  isPremium?: boolean | null;
  isOkazion?: boolean | null;
  /** Optional item rendered at the end of the price row. */
  trailing?: React.ReactNode;
  /** e.g. ` / muaj` after the current price. */
  suffix?: React.ReactNode;
  fontSize?: string | number;
  fontWeight?: number;
  sx?: SxProps<Theme>;
}) {
  const showWas =
    originalPrice != null &&
    price != null &&
    Number.isFinite(originalPrice) &&
    Number.isFinite(price) &&
    originalPrice > price;

  const priceAccessory = trailing ?? null;

  const priceContent = (
    <>
      <Typography
        sx={{
          fontWeight,
          fontSize,
          color: listingPriceAccentColor({ isPremium, isOkazion }),
          lineHeight: 1.2,
        }}
      >
        {formatPrice(price, currency)}
        {suffix}
      </Typography>
      {showWas ? (
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: typeof fontSize === 'number' ? fontSize * 0.78 : `calc(${fontSize} * 0.78)`,
            color: 'text.disabled',
            textDecoration: 'line-through',
            lineHeight: 1.2,
          }}
        >
          {formatPrice(originalPrice, currency)}
        </Typography>
      ) : null}
    </>
  );

  if (!priceAccessory) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', ...((sx as object) || {}) }}>
        {priceContent}
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: priceAccessory ? 'center' : 'baseline',
        justifyContent: priceAccessory ? 'space-between' : undefined,
        flexWrap: priceAccessory ? 'nowrap' : 'wrap',
        minWidth: 0,
        ...((sx as object) || {}),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}>
        {priceContent}
      </Stack>
      {priceAccessory ? <Box sx={{ flexShrink: 0, lineHeight: 0 }}>{priceAccessory}</Box> : null}
    </Stack>
  );
}
