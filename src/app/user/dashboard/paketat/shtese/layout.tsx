import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Paketat shtesë | Paneli im | ${config.site.name}`,
};

export default function ExtraPackagesLayout({ children }: { children: ReactNode }) {
  return children;
}
