import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Referimi | Panel admin | ${config.site.name}`,
};

export default function ReferralLayout({ children }: { children: ReactNode }) {
  return children;
}
