import * as React from 'react';
import { Stack } from '@mui/material';
import { Bell as BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';

import { NotificationInboxSkeleton } from '@/components/user/inbox-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';

export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }} aria-busy>
      <UserPageHeader
        icon={React.createElement(BellIcon, { size: 22, weight: 'duotone' })}
        title="Njoftimet"
        description="Shihni njoftimet tuaja sipas kategorisë."
      />
      <NotificationInboxSkeleton />
    </Stack>
  );
}
