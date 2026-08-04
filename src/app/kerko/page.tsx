import * as React from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

import { PublicShell } from '@/components/public/public-shell';
import { SearchPageView } from '@/components/public/search-page-view';
import { config } from '@/config';

export const metadata: Metadata = {
  title: `Kërko | ${config.site.name}`,
  description: 'Kërko njoftime në KuTaGjej — zgjidh kategorinë, shkruaj dhe shiko rezultatet.',
};

function SearchFallback() {
  return (
    <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export default function SearchPage() {
  return (
    <PublicShell hideHeader hideFooter>
      <Suspense fallback={<SearchFallback />}>
        <SearchPageView />
      </Suspense>
    </PublicShell>
  );
}
