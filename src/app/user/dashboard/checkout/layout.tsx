import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { CheckoutSkeleton } from '@/components/core/content-skeletons';
import { config } from '@/config';

export const metadata: Metadata = {
  title: `Bli kredite | Paneli im | ${config.site.name}`,
};

export default function UserCheckoutLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CheckoutSkeleton />}>{children}</Suspense>;
}
