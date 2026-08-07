'use client';

import * as React from 'react';
import { Stack } from '@mui/material';

import { NotificationPreferencesCard } from '@/components/user/notification-preferences-card';

export default function UserNotificationSettingsPage() {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
      <NotificationPreferencesCard />
    </Stack>
  );
}
