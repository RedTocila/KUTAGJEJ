'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { PackageRowsSkeleton } from '@/components/core/content-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { BoostBalanceChip, ExtraPackagesPanel } from '@/components/user/packages/extra-packages-panel';

export default function ExtraPackagesPage() {
  const { user } = useUser();
  const t = useCopy();
  const balance = Math.max(0, Math.round((Number(user?.boostCredits) || 0) * 10) / 10);

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<SquaresFourIcon size={20} weight="duotone" />}
        title={t.nav.packagesExtra}
        action={<BoostBalanceChip balance={balance} />}
      />
      <React.Suspense fallback={<PackageRowsSkeleton count={4} rowHeight={200} />}>
        <ExtraPackagesPanel />
      </React.Suspense>
    </Stack>
  );
}
