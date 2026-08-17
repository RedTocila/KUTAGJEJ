'use client';

import * as React from 'react';
import { Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { BuyBoostCreditsPanel } from '@/components/user/packages/buy-boost-credits-panel';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';

export default function BoostCoinsPackagesPage() {
  const { user } = useUser();
  const t = useCopy();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<BoostCoinIcon size={22} />}
        title={t.nav.buyBoostCoins}
        description={t.packages.boostCoinsDescription}
        iconSx={{
          bgcolor: (t) => alpha(t.palette.warning.main, t.palette.mode === 'dark' ? 0.28 : 0.18),
          color: 'warning.main',
        }}
      />
      <BuyBoostCreditsPanel showHeader={false} />
    </Stack>
  );
}
