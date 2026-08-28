'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { MainPackagesPanel } from '@/components/user/packages/main-packages-panel';

export default function MainPackagesPage() {
  const { user } = useUser();
  const t = useCopy();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader icon={<PackageIcon size={20} weight="duotone" />} title={t.nav.packagesMain} />
      <MainPackagesPanel />
    </Stack>
  );
}
