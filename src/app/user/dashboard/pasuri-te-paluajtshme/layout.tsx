import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Pasuri të paluajtshme | Paneli im | ${config.site.name}`,
};

export default function UserRealEstateListingLayout({ children }: { children: ReactNode }) {
  return children;
}
