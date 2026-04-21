import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Hyr ose regjistrohu | ${config.site.name}`,
} satisfies Metadata;

export default function UserAuthLayout({ children }: { children: ReactNode }) {
  return children;
}
