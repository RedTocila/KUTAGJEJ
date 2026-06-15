import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Të ruajturat | Paneli im | ${config.site.name}`,
};

export default function UserSavedListingsLayout({ children }: { children: ReactNode }) {
  return children;
}
