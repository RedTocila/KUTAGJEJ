'use client';

import * as React from 'react';
import { CircularProgress, Stack, Box } from '@mui/material';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import { ExtraPackagesPanel } from '@/components/user/packages/extra-packages-panel';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useUser } from '@/hooks/use-user';

export default function ExtraPackagesPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <UserPageHeader
        icon={<SquaresFourIcon size={20} weight="duotone" />}
        title="Paketat shtesë"
        description="Shtesa për njoftime — auto-refresh, premium dhe konvertim."
      />
      <React.Suspense
        fallback={
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        }
      >
        <ExtraPackagesPanel />
      </React.Suspense>
    </Stack>
  );
}
