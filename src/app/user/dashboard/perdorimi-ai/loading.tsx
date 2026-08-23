import * as React from 'react';
import { Stack } from '@mui/material';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';

import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';

export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }} aria-busy>
      <UserPageHeader
        icon={React.createElement(SparkleIcon, { size: 22, weight: 'duotone' })}
        title="Përdorimi AI"
        description="Çmimet e gjenerimeve AI dhe historiku i shpenzimeve me Boost Coins."
      />
      <ContentBlockSkeleton rows={6} rowHeight={52} />
    </Stack>
  );
}
