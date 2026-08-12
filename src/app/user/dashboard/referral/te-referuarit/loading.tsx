import * as React from 'react';
import { Skeleton, Stack } from '@mui/material';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';

import { UserPageHeader } from '@/components/user/layout/user-page-header';

/** Keep the Të referuarit title visible while the route payload loads. */
export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={1.75} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<UsersThreeIcon size={20} weight="duotone" />}
        title="Të referuarit"
        description="Të gjithë përdoruesit që janë regjistruar me kodin tuaj."
      />
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3.5 }} />
    </Stack>
  );
}
