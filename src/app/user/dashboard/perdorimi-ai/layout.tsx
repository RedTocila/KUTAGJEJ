import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Përdorimi AI | Paneli im | ${config.site.name}`,
};

export default function AiUsageLayout({ children }: { children: ReactNode }) {
  return children;
}
