import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Posto njoftim | Paneli im | ${config.site.name}`,
};

export default function UserRealEstateListingLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
