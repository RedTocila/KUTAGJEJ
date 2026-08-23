import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { PostListingFormSkeleton } from '@/components/user/post-listing-header';
import { config } from '@/config';

export const metadata: Metadata = {
  title: `Posto njoftim | Paneli im | ${config.site.name}`,
};

export default function UserRealEstateListingLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PostListingFormSkeleton />}>{children}</Suspense>;
}
