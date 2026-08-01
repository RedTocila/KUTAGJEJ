'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import { MainPackagesPanel } from '@/components/user/packages/main-packages-panel';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useUser } from '@/hooks/use-user';

export default function MainPackagesPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<PackageIcon size={20} weight="duotone" />}
        title="Paketat kryesore"
        description="Zgjidhni planin e abonimit që ju përshtatet."
      />
      <MainPackagesPanel />
    </Stack>
  );
}
