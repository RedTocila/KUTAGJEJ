import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { PostListingFormFieldsSkeleton, PostListingHeader } from '@/components/user/post-listing-header';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Stack } from '@mui/material';
import { config } from '@/config';

export const metadata: Metadata = {
  title: `Posto njoftim | Paneli im | ${config.site.name}`,
};

function PostListingFallback() {
  return (
    <Stack spacing={2.5} aria-busy aria-label="Duke u ngarkuar">
      <PostListingHeader icon={BuildingsIcon} title="Posto njoftim" />
      <PostListingFormFieldsSkeleton />
    </Stack>
  );
}

export default function UserRealEstateListingLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PostListingFallback />}>{children}</Suspense>;
}
