'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';

import { ListingVerifiedShieldBadge } from '@/components/public/professional-listing-detail-ui';

const DEFAULT_LABEL = 'Ky njoftim është i verifikuar dhe i sigurt';

/** Green shield + caption shown under listing meta when the seller account is verified. */
export function ListingVerifiedNotice({
  verified,
  label = DEFAULT_LABEL,
  color = 'success.main',
  fontSize = '0.75rem',
}: {
  verified: boolean;
  label?: string;
  color?: string;
  fontSize?: string | number;
}) {
  if (!verified) return null;
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <ListingVerifiedShieldBadge
        size={14}
        decorative
        color={color === 'success.main' ? undefined : color}
      />
      <Typography sx={{ fontSize, color, fontWeight: 650 }}>{label}</Typography>
    </Stack>
  );
}
