import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Paketat e krediteve | Panel admin | ${config.site.name}`,
};

export default function CreditPackagesLayout({ children }: { children: ReactNode }) {
  return children;
}
