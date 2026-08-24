import * as React from 'react';
import { Stack } from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';

import {
  PostListingFormFieldsSkeleton,
  PostListingHeader,
} from '@/components/user/post-listing-header';

export default function Loading(): React.JSX.Element {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke u ngarkuar">
      <PostListingHeader icon={BuildingsIcon} title="Posto njoftim" />
      <PostListingFormFieldsSkeleton />
    </Stack>
  );
}
