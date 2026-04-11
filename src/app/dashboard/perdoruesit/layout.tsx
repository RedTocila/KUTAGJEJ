import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Përdoruesit | Panel admin | ${config.site.name}`,
} satisfies Metadata;

export default function PerdoruesitLayout({ children }: { children: ReactNode }) {
  return children;
}
