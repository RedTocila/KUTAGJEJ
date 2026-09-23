'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { Box } from '@mui/material';

import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { useMainTabsHosted } from '@/components/main-tabs/main-tabs-shell';
import { SearchPageView } from '@/components/public/search-page-view';

function SearchFallback() {
  return (
    <Box sx={{ px: 2, py: 3 }}>
      <ListingCardsSkeleton count={8} />
    </Box>
  );
}

/** Desktop / non-pager mobile: render search. Hosted pager mounts its own pane. */
export function KerkoPageClient() {
  const hosted = useMainTabsHosted();
  if (hosted) return null;

  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchPageView />
    </Suspense>
  );
}
