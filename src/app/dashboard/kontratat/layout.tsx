import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Kontratat | Panel admin | ${config.site.name}`,
};

export default function KontratatLayout({ children }: { children: ReactNode }) {
  return children;
}
