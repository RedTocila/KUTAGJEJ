import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Paketat kryesore | Paneli im | ${config.site.name}`,
};

export default function MainPackagesLayout({ children }: { children: ReactNode }) {
  return children;
}
