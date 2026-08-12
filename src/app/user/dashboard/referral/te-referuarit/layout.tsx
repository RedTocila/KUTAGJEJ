import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Të referuarit | Paneli im | ${config.site.name}`,
};

export default function UserReferredUsersLayout({ children }: { children: ReactNode }) {
  return children;
}
