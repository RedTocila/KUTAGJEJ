'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';

import { BuyBoostCreditsPanel } from '@/components/user/packages/buy-boost-credits-panel';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useUser } from '@/hooks/use-user';

export default function BoostCoinsPackagesPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<CoinsIcon size={20} weight="duotone" />}
        title="Bli Boost Coins"
        description="Zgjidhni një paketë për të promovuar njoftimet tuaja."
      />
      <BuyBoostCreditsPanel showHeader={false} />
    </Stack>
  );
}
