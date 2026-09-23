import type { Metadata } from 'next';

import { PublicShell } from '@/components/public/public-shell';
import { config } from '@/config';

import { KerkoPageClient } from './kerko-page-client';

export const metadata: Metadata = {
  title: `Kërko | ${config.site.name}`,
  description: 'Kërko njoftime në KuTaGjej — zgjidh kategorinë, shkruaj dhe shiko rezultatet.',
  alternates: { canonical: '/kerko' },
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <PublicShell hideHeader hideFooter>
      <KerkoPageClient />
    </PublicShell>
  );
}
