import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Leads | Paneli im | ${config.site.name}`,
};

export default function UserLeadsLayout({ children }: { children: ReactNode }) {
  return children;
}
