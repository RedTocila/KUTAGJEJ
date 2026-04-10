import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Profili im | Panel admin | ${config.site.name}`,
} satisfies Metadata;

export default function ProfiliLayout({ children }: { children: ReactNode }) {
  return children;
}
