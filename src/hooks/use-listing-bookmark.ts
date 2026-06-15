'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useSavedListingsOptional } from '@/contexts/saved-listings-context';
import { useListingSavedState } from '@/hooks/use-listing-saved-state';
import { useUser } from '@/hooks/use-user';
import { toggleListingSave, type ListingMetricKind } from '@/lib/listing-metrics';
import { paths } from '@/paths';

export function useListingBookmark(
  listingKind: ListingMetricKind,
  listingId: string,
  initial?: { saved?: boolean; saveCount?: number },
) {
  const router = useRouter();
  const { user } = useUser();
  const savedCtx = useSavedListingsOptional();
  const hydratedSaved = useListingSavedState(listingKind, listingId, initial?.saved);
  const [saveCount, setSaveCount] = React.useState(initial?.saveCount ?? 0);

  React.useEffect(() => {
    if (initial?.saveCount !== undefined) setSaveCount(initial.saveCount);
  }, [initial?.saveCount]);

  const toggleSave = React.useCallback(async () => {
    if (!user) {
      router.push(paths.user.auth);
      return;
    }
    if (savedCtx) {
      const result = await savedCtx.toggleSaved(listingKind, listingId);
      if (result) setSaveCount(result.saveCount);
      return;
    }
    const metrics = await toggleListingSave(listingKind, listingId);
    if (metrics) setSaveCount(metrics.saveCount);
  }, [listingKind, listingId, router, savedCtx, user]);

  return { saved: hydratedSaved, saveCount, toggleSave };
}
