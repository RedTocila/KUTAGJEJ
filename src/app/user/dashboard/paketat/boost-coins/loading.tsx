import * as React from 'react';
import { Stack } from '@mui/material';

import { PackageRowsSkeleton } from '@/components/core/content-skeletons';

export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} sx={{ pb: { xs: 12, md: 2 } }} aria-busy aria-label="Duke u ngarkuar">
      <PackageRowsSkeleton count={6} />
    </Stack>
  );
}
