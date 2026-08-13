import * as React from 'react';
import { Stack } from '@mui/material';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { NotificationInboxSkeleton } from '@/components/user/inbox-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';

export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }} aria-busy>
      <UserPageHeader
        icon={React.createElement(UsersThreeIcon, { size: 22, weight: 'duotone' })}
        title="Leads"
        description="Ruajtje, ndarje dhe interes i lartë për njoftimet tuaja — vetëm me Grow / Elite."
      />
      <NotificationInboxSkeleton filterCount={4} rowCount={5} />
    </Stack>
  );
}
