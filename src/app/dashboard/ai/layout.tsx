import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata = {
  title: `Asistent AI | Panel admin | ${config.site.name}`,
} satisfies Metadata;

export default function AdminAiLayout({ children }: { children: ReactNode }) {
  return children;
}
