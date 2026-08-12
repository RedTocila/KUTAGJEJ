import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Verifikimi | Kategoritë | Panel admin | ${config.site.name}`,
};

export default function AccountVerificationLayout({ children }: { children: ReactNode }) {
  return children;
}
