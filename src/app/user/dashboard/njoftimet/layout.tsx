import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Njoftimet | Paneli im | ${config.site.name}`,
};

export default function UserNotificationsLayout({ children }: { children: ReactNode }) {
  return children;
}
