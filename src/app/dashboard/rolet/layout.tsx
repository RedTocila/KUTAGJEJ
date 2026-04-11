import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Rolet | Panel admin | ${config.site.name}`,
} satisfies Metadata;

export default function RoletLayout({ children }: { children: ReactNode }) {
  return children;
}
