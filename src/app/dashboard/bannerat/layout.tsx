import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Bannerat | Panel admin | ${config.site.name}`,
};

export default function HomeBannersLayout({ children }: { children: ReactNode }) {
  return children;
}
