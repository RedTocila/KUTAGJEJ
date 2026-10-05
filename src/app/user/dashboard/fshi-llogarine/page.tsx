'use client';

import * as React from 'react';
import { Stack } from '@mui/material';

import { DeleteAccountCard } from '@/components/user/delete-account-card';

export default function UserDeleteAccountPage() {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <DeleteAccountCard />
    </Stack>
  );
}
