'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';

const DEFAULT_LABEL = 'Ky njoftim është i verifikuar dhe i sigurt';

/** Lock + caption shown under listing meta when the seller account is verified. */
export function ListingVerifiedNotice({
  verified,
  label = DEFAULT_LABEL,
  color = 'text.disabled',
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
      <LockOutlined sx={{ fontSize: 14, color }} />
      <Typography sx={{ fontSize, color }}>{label}</Typography>
    </Stack>
  );
}
