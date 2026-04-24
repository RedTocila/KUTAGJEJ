import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Shpalljet e mia | Paneli im | ${config.site.name}`,
};

export default function UserMyListingsLayout({ children }: { children: ReactNode }) {
  return children;
}
