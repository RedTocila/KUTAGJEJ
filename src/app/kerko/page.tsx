import * as React from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Box } from '@mui/material';

import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { PublicShell } from '@/components/public/public-shell';
import { SearchPageView } from '@/components/public/search-page-view';
import { config } from '@/config';

export const metadata: Metadata = {
  title: `Kërko | ${config.site.name}`,
  description: 'Kërko njoftime në KuTaGjej — zgjidh kategorinë, shkruaj dhe shiko rezultatet.',
  alternates: { canonical: '/kerko' },
  robots: { index: false, follow: true },
};

function SearchFallback() {
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <ListingCardsSkeleton count={8} />
    </Box>
  );
}

export default function SearchPage() {
  return (
    <PublicShell hideHeader hideFooter hideMobileNav>
      <Suspense fallback={<SearchFallback />}>
        <SearchPageView />
      </Suspense>
    </PublicShell>
  );
}
