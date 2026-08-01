import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Boost Coins | Paneli im | ${config.site.name}`,
};

export default function BoostCoinsPackagesLayout({ children }: { children: ReactNode }) {
  return children;
}
