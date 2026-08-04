import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Statistikat | Paneli im | ${config.site.name}`,
};

export default function StatisticsLayout({ children }: { children: ReactNode }) {
  return children;
}
