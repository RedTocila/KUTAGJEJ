import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Cilësimet e njoftimeve | Paneli im | ${config.site.name}`,
};

export default function UserNotificationSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
