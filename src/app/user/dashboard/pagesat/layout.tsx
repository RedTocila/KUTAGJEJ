import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Pagesat e mia | Paneli im | ${config.site.name}`,
};

export default function UserPaymentsLayout({ children }: { children: ReactNode }) {
  return children;
}
