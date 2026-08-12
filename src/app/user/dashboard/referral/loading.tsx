import * as React from 'react';
import { Skeleton, Stack } from '@mui/material';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';

import { UserPageHeader } from '@/components/user/layout/user-page-header';

/** Keep the Referimi title visible while the route payload loads. */
export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={1.75} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }}>
      <UserPageHeader
        icon={<HandshakeIcon size={20} weight="duotone" />}
        title="Referimi"
        description="Ndani linkun — miqtë regjistrohen, ju fitoni Boost Coins."
      />
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3.5 }} />
        <Skeleton variant="rounded" height={88} sx={{ borderRadius: 2.5 }} />
      </Stack>
    </Stack>
  );
}
