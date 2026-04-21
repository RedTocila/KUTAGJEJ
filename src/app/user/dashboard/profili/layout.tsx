import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Profili im | ${config.site.name}`,
} satisfies Metadata;

export default function UserProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
