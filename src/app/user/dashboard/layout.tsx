import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { config } from '@/config';

import { UserDashboardFrame } from './user-dashboard-frame';

export const metadata = {
  title: `Paneli im | ${config.site.name}`,
} satisfies Metadata;

export default function UserDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <UserDashboardFrame>{children}</UserDashboardFrame>
    </Suspense>
  );
}
