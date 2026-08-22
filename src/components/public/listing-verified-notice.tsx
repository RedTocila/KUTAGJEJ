'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';

import { ListingVerifiedShieldBadge } from '@/components/public/professional-listing-detail-ui';

const DEFAULT_LABEL = 'Ky njoftim është i verifikuar dhe i sigurt';

/** Shield + caption shown under the listing contact CTA when the seller is verified. */
export function ListingVerifiedNotice({
  verified,
  label = DEFAULT_LABEL,
  color = 'rgba(255,255,255,0.5)',
  fontSize = '0.8rem',
  align = 'center',
}: {
  verified: boolean;
  label?: string;
  color?: string;
  fontSize?: string | number;
  align?: 'flex-start' | 'center';
}) {
  if (!verified) return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        justifyContent: align,
        width: '100%',
      }}
    >
      <ListingVerifiedShieldBadge size={14} decorative color={color} />
      <Typography sx={{ fontSize, color, fontWeight: 400, lineHeight: 1.3 }}>{label}</Typography>
    </Stack>
  );
}
