import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Fshi llogarinë | Paneli im | ${config.site.name}`,
};

export default function UserDeleteAccountLayout({ children }: { children: ReactNode }) {
  return children;
}
