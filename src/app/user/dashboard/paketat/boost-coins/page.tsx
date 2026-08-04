'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { BuyBoostCreditsPanel } from '@/components/user/packages/buy-boost-credits-panel';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useUser } from '@/hooks/use-user';

export default function BoostCoinsPackagesPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<BoostCoinIcon size={22} />}
        title="Bli Boost Coins"
        description="Zgjidhni një paketë për të promovuar njoftimet tuaja."
      />
      <BuyBoostCreditsPanel showHeader={false} />
    </Stack>
  );
}
