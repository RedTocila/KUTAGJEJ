import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Vendndodhjet (pasuri) | Panel admin | ${config.site.name}`,
};

export default function RealEstateLocationsLayout({ children }: { children: ReactNode }) {
  return children;
}
