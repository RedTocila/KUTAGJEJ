import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Pagesat | Panel admin | ${config.site.name}`,
};

export default function PagesatLayout({ children }: { children: ReactNode }) {
  return children;
}
